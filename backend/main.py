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
    """Callback handler to stream agent intermediate steps via a queue."""

    def __init__(self, q: queue.Queue):
        self.q = q

    def on_chain_start(self, serialized: dict, inputs: dict, **kwargs):
        self.q.put({"type": "step", "content": "Agent starting..."})

    def on_agent_action(self, action, **kwargs):
        thought = action.log.strip() if action.log else ""
        tool = action.tool
        tool_input = json.dumps(action.tool_input) if action.tool_input else ""
        self.q.put({"type": "thought", "content": thought})
        self.q.put(
            {"type": "action", "content": f"Using tool: {tool} with input: {tool_input}"})

    def on_tool_start(self, serialized: dict, input_str: str, **kwargs):
        tool_name = serialized.get("name", "Unknown tool")
        self.q.put(
            {"type": "step", "content": f"Tool '{tool_name}' starting with input: {input_str}"})

    def on_tool_end(self, output: str, **kwargs):
        self.q.put(
            {"type": "observation", "content": f"Tool output: {output.strip()}"})

    def on_agent_finish(self, finish, **kwargs):
        self.q.put(
            {"type": "step", "content": f"Agent finishing: {finish.log.strip()}"})


class PCBuildAgent:
    """Encapsulates the LLM and agent logic for PC building assistance."""

    def __init__(self):
        self.llm = GoogleGenerativeAI(
            model="gemini-2.5-flash-lite", temperature=1)
        self.tools = [DDGSearchTool().to_langchain_tool()]
        self.memory = ConversationBufferMemory(
            memory_key="chat_history", return_messages=True)
        self.system_prompt = (
            "You are an experienced PC build assistant.\n"
            f"Must keep in mind that the current year is {datetime.now().year}.\n"
            "Help users to build their own custom PC using component research.\n"
            "PC MUST be built within user's budget with the best value-for-money components.\n"
            "Always search in English language.\n"
            "Reduce the use of the search tool as much as possible.\n"
            "Use it only when necessary to look up components or compatibility.\n\n"
            "Provide:\n"
            "- Detailed description of each chosen component.\n"
            "- Compatibility and performance reasoning.\n"
            "- Best value-for-money recommendations.\n"
            "- Exact names of the components and their estimated prices.\n\n"
            "Conclude with a detailed summary of the selected components.\n"
        )
        self.agent = self._initialize_agent()

    def _initialize_agent(self):
        return initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=30,
            memory=self.memory,
            agent_kwargs={"system_message": self.system_prompt}
        )


class PCBuildAssistantApp:
    """Main application class to interact with the user, now with SSE support."""

    def __init__(self):
        self.agent = PCBuildAgent()
        self.flask_app = Flask(__name__)
        CORS(self.flask_app)  # Enable CORS for frontend access
        self._setup_routes()

    def _setup_routes(self):
        @self.flask_app.route('/stream', methods=['POST'])
        def stream_response():
            # Log request headers and body for debugging
            print(f"Request headers: {request.headers}")
            print(f"Request body: {request.get_data(as_text=True)}")

            # Check Content-Type
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 415

            data = request.get_json()
            if not data or 'prompt' not in data:
                return jsonify({"error": "Missing 'prompt' in request"}), 400

            prompt = data['prompt']
            q = queue.Queue()

            def run_agent_thread():
                handler = AgentStreamingCallback(q)
                try:
                    response = self.agent.agent.invoke(
                        {"input": prompt},
                        callbacks=[handler]
                    )
                    q.put({"type": "final", "content": response['output']})
                except Exception as e:
                    q.put({"type": "error", "content": str(e)})
                finally:
                    q.put(None)  # Sentinel to end stream

            threading.Thread(target=run_agent_thread, daemon=True).start()

            def generate():
                while True:
                    msg = q.get()
                    if msg is None:
                        break
                    # Ensure proper SSE formatting
                    yield f"data: {json.dumps(msg)}\n\n"

            return Response(generate(), mimetype='text/event-stream', headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            })

    def run_server(self, host='0.0.0.0', port=5000, debug=False):
        self.flask_app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    app = PCBuildAssistantApp()
    app.run_server(debug=True)
