from typing import List, Tuple

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from app.core.config import get_settings
from app.services.token_router import TaskComplexity, token_router
from app.tools.service_tools import check_service_availability as _check_availability


@tool
def check_service_availability(date: str) -> str:
    """Check if a service slot is available for a specific date. Input must be YYYY-MM-DD."""
    return _check_availability(date)


class ServiceAgent:
    def __init__(self) -> None:
        self.settings = get_settings()

    def run(self, user_message: str) -> Tuple[str, List[dict], str]:
        model_name = "llama-3.1-8b-instant"
        llm = ChatGroq(
            model=model_name,
            temperature=0,
            max_tokens=token_router.max_tokens(TaskComplexity.AGENT),
            api_key=self.settings.groq_api_key,
        )

        agent = create_react_agent(llm, [check_service_availability])
        result = agent.invoke({"messages": [HumanMessage(content=user_message)]})

        steps: List[dict] = []
        messages = result.get("messages", [])
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    steps.append({"action": tc["name"], "detail": str(tc.get("args", ""))})

        final_output = ""
        for msg in reversed(messages):
            if hasattr(msg, "content") and msg.content and not getattr(msg, "tool_calls", None):
                final_output = msg.content if isinstance(msg.content, str) else str(msg.content)
                break

        approx_prompt = len(user_message) // 4
        approx_completion = len(final_output) // 4
        token_router.update_usage(approx_prompt, approx_completion, model_name=model_name)

        return final_output, steps, model_name


service_agent = ServiceAgent()
