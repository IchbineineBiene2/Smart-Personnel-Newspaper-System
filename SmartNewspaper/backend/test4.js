async function run() {
  try {
    const res = await fetch('https://news.google.com/rss/articles/CBMiowFBVV95cUxOTGhGOEk2X2pMTnlOeTV2cU5nem4zUzAzX2ZDRWg4clFxSjRFM2E4QzJJdUxSUTQzWWJHZ1RsU0NOemxZYXlsMjd6MEJpMHVQNjlKeExTNENWdU5fcV9zcWpuWmlHbF9ZRC1SaEVXNEFWRHV5UGx4bFBmeXFwQjJObG5oa042ejg1S0o1ODJBZmlOQnZDaHdGaUNBY2VOVXZveXg4?oc=5');
    const text = await res.text();
    const auMatch = text.match(/data-n-au="([^"]+)"/);
    if (auMatch) {
      console.log("Found data-n-au:", auMatch[1]);
    } else {
      console.log("Not found, full text length:", text.length);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
