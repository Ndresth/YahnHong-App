import Swal from 'sweetalert2';

// Instancia configurada para usar estilos de Bootstrap
export const swalBootstrap = Swal.mixin({
    customClass: {
        popup: 'rounded-4 shadow',
        title: 'text-dark fw-bold fs-4',
        htmlContainer: 'text-muted',
        confirmButton: 'btn btn-success fw-bold px-4 py-2 mx-2 rounded-pill',
        cancelButton: 'btn btn-outline-secondary fw-bold px-4 py-2 mx-2 rounded-pill',
        denyButton: 'btn btn-danger fw-bold px-4 py-2 mx-2 rounded-pill',
        input: 'form-control form-control-lg mt-3'
    },
    buttonsStyling: false,
    reverseButtons: true
});
