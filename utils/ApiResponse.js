// ============================================================
// utils/ApiResponse.js — Standardised success response helper
// ============================================================
// Every successful API response in this project uses the same shape:
//   { success: true, message: "...", data: {...}, meta: {...} }
//
// This file provides helper functions so controllers don't have to
// manually build that object every time.
//
// sendSuccess supports two calling styles for backwards compatibility:
//   Style A (preferred): sendSuccess(res, data, message, statusCode, meta)
//   Style B (legacy):    sendSuccess(res, statusCode, message, data, meta)

export const sendSuccess = (
  res,
  arg2 = 200,   // either data (Style A) or statusCode (Style B)
  arg3 = 'Success',
  arg4 = null,
  arg5 = null
) => {
  let statusCode, message, data, meta;

  if (typeof arg2 === 'number') {
    // Style B: second argument is a number → it's the status code
    statusCode = arg2;
    message    = arg3;
    data       = arg4;
    meta       = arg5;
  } else {
    // Style A: second argument is not a number → it's the data payload
    data       = arg2;
    message    = typeof arg3 === 'string' ? arg3 : 'Success';
    statusCode = typeof arg4 === 'number' ? arg4 : 200;
    meta       = arg5;
  }

  // Build the response object — only include data/meta if they have values
  const response = { success: true, message };

  if (data !== null && data !== undefined) response.data = data;
  if (meta !== null && meta !== undefined) response.meta = meta;

  return res.status(statusCode).json(response);
};

// Shorthand for 201 Created responses (e.g. after registering a user)
export const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

// Shorthand for 204 No Content responses (e.g. after deleting something)
export const sendNoContent = (res) => {
  return res.status(204).send();
};
