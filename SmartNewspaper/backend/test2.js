async function run() {
  try {
    const res = await fetch('https://news.google.com/rss/articles/CBMiowFBVV95cUxOTGhGOEk2X2pMTnlOeTV2cU5nem4zUzAzX2ZDRWg4clFxSjRFM2E4QzJJdUxSUTQzWWJHZ1RsU0NOemxZYXlsMjd6MEJpMHVQNjlKeExTNENWdU5fcV9zcWpuWmlHbF9ZRC1SaEVXNEFWRHV5UGx4bFBmeXFwQjJObG5oa042ejg1S0o1ODJBZmlOQnZDaHdGaUNBY2VOVXZveXg4?oc=5');
    const text = await res.text();
    const match = text.match(/<a[^>]+href=["']([^"']+)["']/i);
    console.log(match ? match[1] : 'No match');
  } catch (e) {
    console.error(e);
  }
}
run();
