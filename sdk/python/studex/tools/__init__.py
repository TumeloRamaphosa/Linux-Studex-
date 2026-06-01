"""
Tools — Register and discover custom tools.

Pattern matches Google ADK's @tool decorator:
    @tool
    def my_tool(param: str) -> str:
        \"\"\"Description of my tool.\"\"\"
        return result

    agent.add_tool(my_tool)
"""

from studex.tools.base import tool, Tool, ToolRegistry, BaseTool

__all__ = ["tool", "Tool", "ToolRegistry", "BaseTool"]
