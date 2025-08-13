import json
from langchain_google_genai import GoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.agents import Tool, initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory

from ddgs import DDGS
from dotenv import load_dotenv
from datetime import datetime
from time import sleep

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
            agent_kwargs={
                "system_message": self.system_prompt
            }
        )

    def invoke(self, user_input: str) -> str:
        return self.agent.invoke({"input": user_input})


class PCBuildAssistantApp:
    """Main application class to interact with the user."""

    def __init__(self):
        self.agent = PCBuildAgent()

    def invoke(self, user_input: str):
        try:
            response = self.agent.invoke(user_input)
            return response['output']
        except Exception as e:
            print(f"Error: {e}")
            return "Something went wrong."


# Entry point
if __name__ == "__main__":
    app = PCBuildAssistantApp()
    response = app.invoke("Build a gaming PC, my budget is 50000 INR.")
    print(response)
