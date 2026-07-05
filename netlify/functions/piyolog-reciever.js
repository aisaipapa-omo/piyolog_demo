// netlify/functions/piyolog-receiver.js
exports.handler = async (event) => {
  try {
    console.log('Body:', event.body);
    console.log('Headers:', JSON.stringify(event.headers));

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'received' })
    };
  } catch (error) {
    console.log('ERROR:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', message: error.message })
    };
  }
};
