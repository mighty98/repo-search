import { trackPromise } from 'react-promise-tracker';
import { buildQueryString } from './Utility';

const getHeaders = () => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  return headers;
};

async function _get(uri, params, showLoader = true) {
  try {
    let headers = getHeaders();
    const options = { method: 'GET', headers: headers };
    const query = buildQueryString(params);
    const url = `${uri}${query}`;
    const fetchResult = !showLoader ? await fetch(url, options) : await trackPromise(fetch(url, options));

    const result = await fetchResult.json();

    if (fetchResult.ok) {
      return result;
    }

    const responseError = {
      type: 'Error',
      message: result.message || 'Something went wrong',
      data: result.data || '',
      code: result.code || '',
    };

    let error = new Error();
    error = { ...error, ...responseError };
    throw error;
  } catch (error) {
    if (error) {
      throw error.message || 'Internal Error';
    }
  }
}

async function _post(uri, params, dataArg, showLoader = true) {
  try {
    let headers = getHeaders();
    const data = typeof dataArg === 'object' ? JSON.stringify(dataArg) : dataArg;
    const options = { method: 'POST', headers: headers, body: data };
    const query = buildQueryString(params);
    const url = `${uri}${query}`;
    const fetchResult = !showLoader ? await fetch(url, options) : await trackPromise(fetch(url, options));
    const result = await fetchResult.json();

    if (fetchResult.ok) {
      return result;
    }

    const responseError = {
      type: 'Error',
      message: result.message || 'Something went wrong',
      data: result.data || '',
      code: result.code || '',
    };

    let error = new Error();
    error = { ...error, ...responseError };
    throw error;
  } catch (error) {
    if (error) {
      throw error.message || 'Internal Error';
    }
  }
}

const ApiComponent = {
  getApi: _get,
  postApi: _post,
};
export default ApiComponent;
