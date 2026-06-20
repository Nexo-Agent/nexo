pub const KEY_TAVILY_API_KEY: &str = "web_search.tavily.api_key";
pub const KEY_EXA_API_KEY: &str = "web_search.exa.api_key";
pub const KEY_PROVIDER: &str = "web_search.provider";

pub const DEFAULT_PROVIDER: &str = "tavily";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebSearchProvider {
    Tavily,
    Exa,
}

impl WebSearchProvider {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Tavily => "tavily",
            Self::Exa => "exa",
        }
    }

    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_lowercase().as_str() {
            "tavily" => Ok(Self::Tavily),
            "exa" => Ok(Self::Exa),
            other => Err(format!("Unknown web search provider: {other}")),
        }
    }
}
