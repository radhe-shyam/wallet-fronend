import axios from 'axios';

const walletBackend = axios.create({
    baseURL: 'http://wallet--backend.herokuapp.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default walletBackend;