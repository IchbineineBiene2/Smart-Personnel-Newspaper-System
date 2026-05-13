const BASE_URL = 'http://localhost:3000';

async function test() {
  try {
    console.log('📝 Registering test user...');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      })
    });
    
    const registerData = await registerRes.json();
    console.log('Register response:', registerData);
    
    if (registerData.token) {
      const token = registerData.token;
      const userId = registerData.user.userId;
      
      console.log('\n🔐 Got token:', token.substring(0, 20) + '...');
      console.log('👤 User ID:', userId);
      
      console.log('\n📰 Creating newspaper...');
      const createRes = await fetch(`${BASE_URL}/api/archive/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Test Newspaper',
          description: 'Testing Phase 3 integration',
          selectedArticles: [1, 2, 3]
        })
      });
      
      const createData = await createRes.json();
      console.log('Create response:', createData);
      
      console.log('\n📚 Fetching user editions...');
      const getRes = await fetch(`${BASE_URL}/api/archive/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const getData = await getRes.json();
      console.log('Editions:', JSON.stringify(getData, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
