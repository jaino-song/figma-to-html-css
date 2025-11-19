
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export const convertFigma = async (fileKey: string, token: string) => {
  const response = await api.post('/figma/convert', { fileKey, token });
  return response.data;
};

