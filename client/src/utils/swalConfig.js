import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Creamos una instancia configurada para usar estilos de Bootstrap
export const swalBootstrap = MySwal.mixin({
    customClass: {
        popup: 'rounded-4 shadow', // Bordes redondeados y sombra
        title: 'text-dark fw-bold fs-4', // Título oscuro y negrita
        htmlContainer: 'text-muted', // Texto del cuerpo grisáceo
        confirmButton: 'btn btn-success fw-bold px-4 py-2 mx-2 rounded-pill', // Botón confirmar verde estilo app
        cancelButton: 'btn btn-danger fw-bold px-4 py-2 mx-2 rounded-pill', // Botón cancelar rojo estilo app
        input: 'form-control form-control-lg mt-3' // Estilo para cuando usamos prompt
    },
    buttonsStyling: false, // Desactivamos estilos por defecto de SweetAlert
    reverseButtons: true, // Poner cancelar a la izquierda y confirmar a la derecha (más común)
    showClass: { // Animación de entrada suave
        popup: `
          animate__animated
          animate__fadeInUp
          animate__faster
        `
      },
      hideClass: { // Animación de salida suave
        popup: `
          animate__animated
          animate__fadeOutDown
          animate__faster
        `
      }
});