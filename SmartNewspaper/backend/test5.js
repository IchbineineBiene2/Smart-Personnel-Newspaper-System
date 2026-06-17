function extractUrlFromGoogleNewsLink(googleNewsUrl) {
  try {
    const match = googleNewsUrl.match(/articles\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    
    let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const decoded = Buffer.from(base64, 'base64').toString('latin1');
    const urlMatch = decoded.match(/https?:\/\/[^\x00-\x1F\x7F]+/i);
    return urlMatch ? urlMatch[0] : null;
  } catch (e) {
    return null;
  }
}

console.log(extractUrlFromGoogleNewsLink('https://news.google.com/rss/articles/CBMiowFBVV95cUxOTGhGOEk2X2pMTnlOeTV2cU5nem4zUzAzX2ZDRWg4clFxSjRFM2E4QzJJdUxSUTQzWWJHZ1RsU0NOemxZYXlsMjd6MEJpMHVQNjlKeExTNENWdU5fcV9zcWpuWmlHbF9ZRC1SaEVXNEFWRHV5UGx4bFBmeXFwQjJObG5oa042ejg1S0o1ODJBZmlOQnZDaHdGaUNBY2VOVXZveXg4?oc=5'));
