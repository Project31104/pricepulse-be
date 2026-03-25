// utils/ApiResponse.js
// Standardised response format for successful API responses.

export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, 201, message, data);
};

export const sendNoContent = (res) => {
  return res.status(204).send();
};