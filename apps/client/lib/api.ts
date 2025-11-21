// axios instance for fetching data from Figma API
// instantiated for possible scalability and declaring convertFigma function for easy usage
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// using post request instead of get request for security reasons and to avoid leaking the token in the URL
export const convertFigma = async (fileKey: string, token: string) => {
  const response = await api.post('/figma/convert', { fileKey, token });
  return response.data;
};

