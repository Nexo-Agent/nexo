use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedSearchResult {
    pub provider: String,
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub answer: Option<String>,
    pub results: Vec<NormalizedResultItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedResultItem {
    pub title: String,
    pub url: String,
    pub snippet: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
}

// --- Tavily API types ---

#[derive(Debug, Serialize)]
pub struct TavilySearchRequest {
    pub query: String,
    pub search_depth: String,
    pub max_results: u8,
    pub include_answer: bool,
}

#[derive(Debug, Deserialize)]
pub struct TavilySearchResponse {
    #[serde(default)]
    pub answer: Option<String>,
    #[serde(default)]
    pub results: Vec<TavilyResult>,
}

#[derive(Debug, Deserialize)]
pub struct TavilyResult {
    pub title: String,
    #[serde(alias = "link")]
    pub url: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub snippet: Option<String>,
    #[serde(default)]
    pub score: Option<f64>,
}

// --- Exa API types ---

#[derive(Debug, Serialize)]
pub struct ExaSearchRequest {
    pub query: String,
    #[serde(rename = "numResults")]
    pub num_results: u8,
    #[serde(rename = "type")]
    pub search_type: String,
    pub contents: ExaContentsRequest,
}

#[derive(Debug, Serialize)]
pub struct ExaContentsRequest {
    pub highlights: bool,
}

#[derive(Debug, Deserialize)]
pub struct ExaSearchResponse {
    #[serde(default)]
    pub results: Vec<ExaResult>,
}

#[derive(Debug, Deserialize)]
pub struct ExaResult {
    pub title: String,
    pub url: String,
    #[serde(default)]
    pub score: Option<f64>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub highlights: Option<Vec<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_tavily_response() {
        let json = r#"{
            "answer": "Test answer",
            "results": [{
                "title": "Example",
                "url": "https://example.com",
                "content": "Snippet text",
                "score": 0.9
            }]
        }"#;
        let parsed: TavilySearchResponse = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.answer.as_deref(), Some("Test answer"));
        assert_eq!(parsed.results.len(), 1);
        assert_eq!(parsed.results[0].title, "Example");
        assert_eq!(parsed.results[0].url, "https://example.com");
    }

    #[test]
    fn deserializes_tavily_link_alias() {
        let json = r#"{
            "results": [{
                "title": "Example",
                "link": "https://example.com/page"
            }]
        }"#;
        let parsed: TavilySearchResponse = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.results[0].url, "https://example.com/page");
    }

    #[test]
    fn deserializes_exa_response() {
        let json = r#"{
            "results": [{
                "title": "AI News",
                "url": "https://example.com/ai",
                "score": 0.85,
                "highlights": ["Latest AI developments"]
            }]
        }"#;
        let parsed: ExaSearchResponse = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.results.len(), 1);
        assert_eq!(
            parsed.results[0].highlights.as_ref().unwrap()[0],
            "Latest AI developments"
        );
    }
}
