/**
 * Media Fetching Engine (Frontend)
 * 
 * Fetches external media URLs through the required backend proxy (/api/fetchMedia).
 * Converts the response into a File object for seamless integration with the upload pipeline.
 */

const PROXY_ENDPOINT = '/api/fetchMedia?url=';

/**
 * Fetches an external media URL and returns a File object.
 * @param {string} url - The external URL to fetch.
 * @returns {Promise<File>} - A File object ready for the upload pipeline.
 */
export async function fetchMediaAsFile(url) {
  const targetUrl = url.trim();
  if (!targetUrl) throw new Error('Empty URL');

  // Construct the proxied URL
  const proxiedUrl = `${PROXY_ENDPOINT}${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxiedUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    // Get the blob and content type
    const blob = await response.blob();
    const contentType = blob.type;

    // Validate type on frontend too
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      throw new Error(`Invalid media type: ${contentType}`);
    }

    // Extract filename from URL or use a default
    const filename = targetUrl.split('/').pop().split('?')[0] || 'remote-media';
    
    // Create a File object
    // This allows the media to be passed into the exact same processing pipeline as manual uploads
    return new File([blob], filename, { type: contentType });
  } catch (err) {
    console.error('[MediaFetcher] Error:', err);
    throw err;
  }
}
