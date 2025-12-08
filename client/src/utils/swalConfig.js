import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const swalBootstrap = MySwal.mixin({
    customClass: {
        popup: 'rounded-4 shadow',
        title: 'text-dark fw-bold fs-4',
        confirmButton: 'btn btn-success fw-bold px-4 py-2 mx-2 rounded-pill',
        cancelButton: 'btn btn-danger fw-bold px-4 py-2 mx-2 rounded-pill',
        input: 'form-control form-control-lg mt-3'
    },
    buttonsStyling: false,
    reverseButtons: true
});