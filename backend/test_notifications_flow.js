import jwt from 'jsonwebtoken';
import axios from 'axios';

const API = 'http://localhost:4000';
const secret = process.env.JWT_SECRET || 'devsecret123';

async function runForUser(username, role) {
  const token = jwt.sign({ username, role }, secret, { expiresIn: '1h' });
  console.log(`\n--- Testing notifications for ${username} (${role}) ---`);
  try {
    // Create notification
    const post = await axios.post(`${API}/api/test-notification`, { message: `Hello ${username} - test` }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('POST created:', post.status, post.data?.notification?._id || '(no id)');

    // Get notifications
    const get = await axios.get(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('GET notifications count:', get.data.notifications.length, 'unreadCount:', get.data.unreadCount);
    const newest = get.data.notifications[0];
    if (!newest) return;

    // Mark as read
    const mark = await axios.put(`${API}/api/notifications/${newest._id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    console.log('PUT mark read status:', mark.status, mark.data?.message);

    // Create another notification to test delete
    const post2 = await axios.post(`${API}/api/test-notification`, { message: `Delete me ${username}` }, { headers: { Authorization: `Bearer ${token}` } });
    const delId = post2.data.notification._id;
    console.log('Created for delete test:', delId);

    // Delete it
    const del = await axios.delete(`${API}/api/notifications/${delId}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('DELETE status:', del.status, del.data?.message);

    // Mark all as read
    const markAll = await axios.put(`${API}/api/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
    console.log('PUT read-all status:', markAll.status, markAll.data?.message);

  } catch (err) {
    console.error('Error in flow for', username);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
    console.error('Message:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

(async () => {
  await runForUser('teacher1', 'Teacher');
  await runForUser('student1', 'Student');
})();
