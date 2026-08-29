// Establecer conexión WebSocket global con el backend
const socket = io();

// Exponer en window para que otros scripts puedan usarlo
window.appSocket = socket;

console.log('Cliente WebSocket inicializado.');
