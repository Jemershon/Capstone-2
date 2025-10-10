import jwt from 'jsonwebtoken';
import axios from 'axios';

const sendTest = async () => {
  try {
    const secret = process.env.JWT_SECRET || 'devsecret123';
    const token = jwt.sign({ username: 'teacher1', role: 'Teacher' }, secret, { expiresIn: '1h' });
    console.log('Using token:', token.substring(0, 20) + '...');
    // Check GET /api/notifications
    try {
      const getRes = await axios.get('http://localhost:4000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('GET /api/notifications status:', getRes.status);
      console.log('GET data length:', Array.isArray(getRes.data.notifications) ? getRes.data.notifications.length : '(no array)');
    } catch (gerr) {
      console.error('GET /api/notifications error:', gerr.response ? gerr.response.status : gerr.message, gerr.response ? gerr.response.data : '');
    }

    // Send test notification
    const res = await axios.post('http://localhost:4000/api/test-notification', { message: 'Test notification from CLI' }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('POST /api/test-notification status:', res.status);
    console.log('POST data:', res.data);
  } catch (err) {
    console.error('Error sending test notification:', err && err.response ? err.response.status : err && err.message);
    if (err && err.response) console.error('Response data:', err.response.data);
    else console.error('Error detail:', err);
  }
};

sendTest();
