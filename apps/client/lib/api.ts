// axios instance for fetching data from Figma API
// instantiated for possible scalability and declaring convertFigma function for easy usage
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// using post request instead of get request for security reasons and to avoid leaking the token in the URL
export const convertFigma = async (fileKey: string, token: string) => {
  console.log('🚀 API CALL: Fetching from server...', { fileKey, timestamp: new Date().toISOString() });
  const response = await api.post('/figma/convert', { fileKey, token });
  console.log('✅ API RESPONSE: Received data from server', { timestamp: new Date().toISOString() });
  return response.data;
};

