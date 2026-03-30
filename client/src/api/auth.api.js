import api from './axiosInstance.js';

export function verifyOTP({ idToken }) {
  return api.post('/auth/verify-otp', { idToken });
}

export function completeRegistration(data) {
  return api.post('/auth/complete-registration', data);
}

export function login({ phoneNumber, password }) {
  return api.post('/auth/login', { phoneNumber, password });
}

export function getMe() {
  return api.get('/auth/me');
}

export function updateProfilePicture(formData) {
  return api.post('/auth/profile-picture', formData, {
    transformRequest: [
      (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    ],
  });
}
