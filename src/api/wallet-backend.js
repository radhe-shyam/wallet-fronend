import axios from 'axios';

const walletBackend = axios.create({
    baseURL: 'https://wallet--backend.herokuapp.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default walletBackend;