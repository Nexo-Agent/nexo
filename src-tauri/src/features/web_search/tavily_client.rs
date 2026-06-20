use super::models::{NormalizedResultItem, TavilySearchRequest, TavilySearchResponse};
use crate::error::AppError;
use reqwest::Client;
use std::time::Duration;

const TAVILY_SEARCH_URL: &str = "https://api.tavily.com/search";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(25);

pub async fn search(
    api_key: &str,
    query: &str,
    max_results: u8,
) -> Result<(Option<String>, Vec<NormalizedResultItem>), AppError> {
    let client = Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| AppError::Generic(e.to_string()))?;

    let body = TavilySearchRequest {
        query: query.to_string(),
        search_depth: "basic".to_string(),
        max_results,
        include_answer: true,
    };

    let response = client
        .post(TAVILY_SEARCH_URL)
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(AppError::Validation(
            "Tavily API key is invalid or unauthorized".to_string(),
        ));
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(AppError::Generic(
            "Tavily rate limit exceeded. Please try again later.".to_string(),
        ));
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Generic(format!(
            "Tavily search failed with status {status}: {body}"
        )));
    }

    let parsed: TavilySearchResponse = response.json().await?;
    let results = parsed
        .results
        .into_iter()
        .map(|r| NormalizedResultItem {
            title: r.title,
            url: r.url,
            snippet: r.content.or(r.snippet).unwrap_or_default(),
            score: r.score,
        })
        .collect();

    Ok((parsed.answer, results))
}
