export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
	? import.meta.env.VITE_API_URL
	: (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
		? process.env.REACT_APP_API_URL
		: 'http://localhost:4000';


