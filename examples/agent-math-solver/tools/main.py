from fastmcp import FastMCP
import math

# Initialize FastMCP Server
mcp = FastMCP("Math Solver")

@mcp.tool()
def calculate(expression: str) -> str:
    """
    Evaluates a mathematical expression and returns the result.
    Supported operations: +, -, *, /, **, and math functions like sin, cos, sqrt.
    
    Args:
        expression: The mathematical expression string (e.g., "2 + 2", "math.sqrt(16)")
    """
    try:
        # Create a safe environment with math module
        safe_env = {"__builtins__": None, "math": math, "abs": abs, "round": round, "min": min, "max": max}
        
        # Compile and evaluate the expression
        # Note: In production, use a more robust parser for security.
        # This is a simple example allowing 'math' module access.
        result = eval(expression, safe_env)
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    mcp.run()
