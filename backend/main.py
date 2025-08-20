import json
from langchain_google_genai import GoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.agents import Tool, initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from langchain_core.callbacks import BaseCallbackHandler
from ddgs import DDGS
from dotenv import load_dotenv
from datetime import datetime
from time import sleep
import queue
import threading
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import uuid

load_dotenv()


class DDGSearchTool:
    """DuckDuckGo Search Tool wrapper for LangChain Tool interface."""
    @staticmethod
    def search(query: str) -> str:
        sleep(4)  # Rate limiting
        with DDGS(verify=True) as ddgs:
            results = ddgs.text(query, max_results=5)
            if not results:
                return "No search results found."
            final = []
            for result in results:
                final.append({
                    "title": result['title'],
                    "body": result['body'],
                    "href": result['href']
                })
            with open('Results.json', 'w') as f:
                json.dump(final, f, indent=4)
            return '\n'.join(
                f"Title: {result['title']}, Body:{result['body']}, (URL: {result['href']})"
                for result in results[:5]
            )

    def to_langchain_tool(self) -> Tool:
        return Tool.from_function(
            name="Search",
            func=self.search,
            description=(
                "Useful for finding current or detailed info about PC parts or compatibility. "
                "Input should be a search query."
            ),
        )


class AgentStreamingCallback(BaseCallbackHandler):
    """Enhanced callback handler to stream detailed agent steps via SSE."""

    def __init__(self, q: queue.Queue):
        self.q = q
        self.session_id = str(uuid.uuid4())

    def _send_event(self, event_type: str, content: str, metadata: dict = None):
        """Send a properly formatted SSE event."""
        event_data = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id,
            "type": event_type,
            "content": content,
            "metadata": metadata or {}
        }
        self.q.put(event_data)

    def on_chain_start(self, serialized: dict, inputs: dict, **kwargs):
        self._send_event("chain_start", "🤖 PC Build Assistant is starting to analyze your request...")

    def on_llm_start(self, serialized: dict, prompts: list, **kwargs):
        self._send_event("llm_start", "🧠 Language model is processing your requirements...")

    def on_agent_action(self, action, **kwargs):
        # Extract and clean the thought process
        thought = action.log.strip() if action.log else "Analyzing the request..."
        
        # Send the reasoning/thought process
        self._send_event("thinking", f"💭 Thinking: {thought}", {
            "tool": action.tool,
            "tool_input": action.tool_input
        })
        
        # Send action being taken
        tool_input_str = json.dumps(action.tool_input) if isinstance(action.tool_input, dict) else str(action.tool_input)
        self._send_event("action", f"🔧 Taking action: Using {action.tool} with input: {tool_input_str}")

    def on_tool_start(self, serialized: dict, input_str: str, **kwargs):
        tool_name = serialized.get("name", "Unknown tool")
        self._send_event("tool_start", f"🔍 Starting {tool_name}: {input_str}")

    def on_tool_end(self, output: str, **kwargs):
        # Truncate long outputs for better UX
        truncated_output = output[:200] + "..." if len(output) > 200 else output
        self._send_event("tool_end", f"✅ Search completed: {truncated_output.strip()}")

    def on_agent_finish(self, finish, **kwargs):
        self._send_event("agent_finish", "🎯 Analysis complete, preparing final recommendation...")

    def on_llm_end(self, response, **kwargs):
        self._send_event("llm_end", "✨ Processing complete")

    def on_chain_end(self, outputs: dict, **kwargs):
        self._send_event("chain_end", "🏁 PC build recommendation ready!")

    def on_llm_error(self, error, **kwargs):
        self._send_event("error", f"❌ Error in language model: {str(error)}")

    def on_tool_error(self, error, **kwargs):
        self._send_event("error", f"❌ Tool error: {str(error)}")

    def on_agent_error(self, error, **kwargs):
        self._send_event("error", f"❌ Agent error: {str(error)}")


class PCBuildAgent:
    """Encapsulates the LLM and agent logic for PC building assistance."""

    def __init__(self):
        self.llm = GoogleGenerativeAI(
            model="gemini-2.5-flash-lite", 
            temperature=0.7,  # Slightly reduced for more consistent responses
            verbose=True
        )
        self.tools = [DDGSearchTool().to_langchain_tool()]
        self.memory = ConversationBufferMemory(
            memory_key="chat_history", 
            return_messages=True,
            max_token_limit=2000  # Prevent memory from growing too large
        )
        self.system_prompt = (
            "You are an expert PC build assistant and hardware specialist.\n"
            f"Current year: {datetime.now().year}\n\n"
            "Your mission:\n"
            "- Help users build custom PCs within their budget\n"
            "- Focus on best value-for-money components\n"
            "- Always search in English\n"
            "- Use search tool strategically - only when you need current pricing or specific component details\n\n"
            "For each recommendation, provide:\n"
            "1. Component name and model\n"
            "2. Estimated price\n"
            "3. Why this component (performance/value reasoning)\n"
            "4. Compatibility notes\n\n"
            "Think step by step and explain your reasoning clearly.\n"
            "End with a complete build summary including total estimated cost.\n"
        )
        self.agent = self._initialize_agent()

    def _initialize_agent(self):
        return initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=15,  # Reduced to prevent excessive searches
            memory=self.memory,
            agent_kwargs={
                "system_message": self.system_prompt,
                "prefix": "You are a PC build expert. Think carefully about each component choice."
            }
        )


class PCBuildAssistantApp:
    """Main Flask application with proper SSE implementation."""

    def __init__(self):
        self.agent = PCBuildAgent()
        self.flask_app = Flask(__name__)
        CORS(self.flask_app, supports_credentials=True)
        self._setup_routes()

    def _setup_routes(self):
        @self.flask_app.route('/', methods=['GET'])
        def health_check():
            return jsonify({
                "status": "healthy",
                "service": "PC Build Assistant",
                "endpoints": {
                    "stream": "/stream (POST)",
                    "health": "/ (GET)"
                }
            })

        @self.flask_app.route('/stream', methods=['POST'])
        def stream_response():
            """Stream agent responses using Server-Sent Events."""
            
            # Validate request
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 415

            data = request.get_json()
            if not data or 'prompt' not in data:
                return jsonify({"error": "Missing 'prompt' in request body"}), 400

            prompt = data['prompt'].strip()
            if not prompt:
                return jsonify({"error": "Prompt cannot be empty"}), 400

            # Create queue for streaming events
            event_queue = queue.Queue()
            
            def run_agent():
                """Run the agent in a separate thread."""
                callback_handler = AgentStreamingCallback(event_queue)
                
                try:
                    # Send initial event
                    event_queue.put({
                        "id": str(uuid.uuid4()),
                        "timestamp": datetime.now().isoformat(),
                        "type": "start",
                        "content": f"🚀 Starting PC build analysis for: {prompt[:100]}..."
                    })
                    
                    # Run the agent
                    response = self.agent.agent.invoke(
                        {"input": prompt},
                        callbacks=[callback_handler]
                    )
                    
                    # Send final response
                    event_queue.put({
                        "id": str(uuid.uuid4()),
                        "timestamp": datetime.now().isoformat(),
                        "type": "final_answer",
                        "content": response.get('output', 'No response generated'),
                        "metadata": {
                            "total_tokens": getattr(response, 'total_tokens', None),
                            "processing_time": "completed"
                        }
                    })
                    
                except Exception as e:
                    print(f"Agent error: {e}")  # Log for debugging
                    event_queue.put({
                        "id": str(uuid.uuid4()),
                        "timestamp": datetime.now().isoformat(),
                        "type": "error",
                        "content": f"An error occurred: {str(e)}",
                        "metadata": {"error_type": type(e).__name__}
                    })
                finally:
                    # Signal end of stream
                    event_queue.put(None)

            # Start agent in background thread
            agent_thread = threading.Thread(target=run_agent, daemon=True)
            agent_thread.start()

            def generate_sse_events():
                """Generate Server-Sent Events from the queue."""
                try:
                    while True:
                        try:
                            # Get event from queue with timeout
                            event = event_queue.get(timeout=60)  # 60 second timeout
                            
                            if event is None:
                                # End of stream signal
                                yield f"event: end\ndata: {json.dumps({'type': 'stream_end', 'content': 'Stream completed'})}\n\n"
                                break
                            
                            # Format as proper SSE
                            event_type = event.get('type', 'message')
                            event_data = json.dumps(event, ensure_ascii=False)
                            
                            yield f"event: {event_type}\ndata: {event_data}\n\n"
                            
                        except queue.Empty:
                            # Send keepalive ping
                            yield f"event: ping\ndata: {json.dumps({'type': 'ping', 'timestamp': datetime.now().isoformat()})}\n\n"
                            continue
                            
                except GeneratorExit:
                    print("Client disconnected from SSE stream")
                except Exception as e:
                    print(f"SSE streaming error: {e}")
                    yield f"event: error\ndata: {json.dumps({'type': 'stream_error', 'content': str(e)})}\n\n"

            # Return SSE response with proper headers
            response = Response(
                generate_sse_events(),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',  # Disable nginx buffering
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            )
            return response

        @self.flask_app.route('/stream', methods=['OPTIONS'])
        def stream_options():
            """Handle CORS preflight requests."""
            return jsonify({}), 200

    def run_server(self, host='0.0.0.0', port=5000, debug=False):
        """Start the Flask development server."""
        print(f"🚀 PC Build Assistant starting on http://{host}:{port}")
        print(f"📡 SSE endpoint available at http://{host}:{port}/stream")
        self.flask_app.run(host=host, port=port, debug=debug, threaded=True)


if __name__ == "__main__":
    app = PCBuildAssistantApp()
    app.run_server(debug=True)