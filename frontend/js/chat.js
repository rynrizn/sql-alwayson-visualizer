let clienteSeleccionado = { id: 2, nombre: 'Carlos' };

document.addEventListener('DOMContentLoaded', () => {
  const lista = document.getElementById('lista-clientes');
  const tituloChat = document.getElementById('chat-destinatario');

  lista.addEventListener('click', (e) => {
    const item = e.target.closest('li');
    if (!item) return;
    clienteSeleccionado = {
      id: parseInt(item.dataset.id, 10),
      nombre: item.innerText.replace('🟢 ', '')
    };
    tituloChat.innerText = `Transferir a: ${clienteSeleccionado.nombre}`;
  });
});
