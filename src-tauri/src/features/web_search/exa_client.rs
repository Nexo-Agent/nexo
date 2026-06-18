use super::models::{
    ExaContentsRequest, ExaSearchRequest, ExaSearchResponse, NormalizedResultItem,
};
use crate::error::AppError;
use reqwest::Client;
use std::time::Duration;

const EXA_SEARCH_URL: &str = "https://api.exa.ai/search";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(25);

pub async fn search(
    api_key: &str,
    query: &str,
    max_results: u8,
) -> Result<Vec<NormalizedResultItem>, AppError> {
    let client = Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| AppError::Generic(e.to_string()))?;

    let body = ExaSearchRequest {
        query: query.to_string(),
        num_results: max_results,
        search_type: "auto".to_string(),
        contents: ExaContentsRequest { highlights: true },
    };

    let response = client
        .post(EXA_SEARCH_URL)
        .header("x-api-key", api_key)
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(AppError::Validation(
            "Exa API key is invalid or unauthorized".to_string(),
        ));
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(AppError::Generic(
            "Exa rate limit exceeded. Please try again later.".to_string(),
        ));
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Generic(format!(
            "Exa search failed with status {status}: {body}"
        )));
    }

    let parsed: ExaSearchResponse = response.json().await?;
    let results = parsed
        .results
        .into_iter()
        .map(|r| {
            let snippet = r
                .highlights
                .and_then(|h| h.into_iter().next())
                .or(r.text)
                .unwrap_or_default();
            NormalizedResultItem {
                title: r.title,
                url: r.url,
                snippet,
                score: r.score,
            }
        })
        .collect();

    Ok(results)
}
