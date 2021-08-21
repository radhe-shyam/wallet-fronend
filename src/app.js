import Swal from 'sweetalert2'
import walletBackend from './api/wallet-backend';
import { useState, useEffect } from 'react';
import './app.css';
const disableSwalConfig = {
    allowEscapeKey: false,
    backdrop: true,
    allowOutsideClick: false
};


const App = () => {
    const [user, setUser] = useState(null);
    const [transList, setTranslist] = useState([]);
    const getUserDetails = async (user) => {

        try {
            const { data: { data } } = await walletBackend.get(`/wallet/${user.id}`);
            setUser(data);
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            localStorage.clear();
        }
    }
    const getTransList = async (user) => {

        try {
            const { data: { data } } = await walletBackend.get(`/transactions`, {
                params: {
                    walletId: user.id,
                    skip: 0,
                    limit: 50
                }
            });
            setTranslist(data);
        } catch (error) {

        }
    }

    const addOrPayMoney = (action) => {
        const html = `
            <form>
             <label>Enter the amount(with max 4 decimal point). e.g. "1000" or "10.5555"</label><br/>
             <input id="amount" class="swal2-input" placeholder="Amount" type="number" />
             <input id="description" class="swal2-input" placeholder="Description" type="text" />
            </form>
        `;
        Swal.fire({
            title: `${action} Money`,
            html: html,
            showCancelButton: true,
            confirmButtonText: action,
            showLoaderOnConfirm: true,
            ...disableSwalConfig,
            preConfirm: () => {
                let amount = +document.getElementById('amount').value;
                let description = document.getElementById('description').value;
                if (!amount || amount < 0.0001 || amount > 1000000 || !(new RegExp(/^\d*(\.\d{1,4})?$/).test(amount))) return Swal.showValidationMessage(`Amount should be between 0.0001 to 1000000. Max. decimal points are 4`);
                if (!description) Swal.showValidationMessage(`Description can't be empty`);
                let successMsg = `You added INR ${amount} in your wallet!`;
                if (action === 'Pay') {
                    successMsg = `You paid INR ${amount} from your wallet!`;
                    amount = -amount;
                }
                return walletBackend.post(`/transact/${user.id}`, {
                    amount,
                    description
                }).then(result => {
                    Swal.fire(`Good job! ${user.name}`, successMsg, "success");
                    getUserDetails(user);
                    getTransList(user);
                }).catch(error => {
                    let errorMsg = `Request failed: ${error}`;
                    if (error && error.response && error.response.data) {
                        errorMsg = error.response.data.prettyMsg;
                    }
                    Swal.showValidationMessage(errorMsg);
                });
            }
        });
        document.getElementById('amount').focus();
    }
    useEffect(() => {
        let oldUser;
        try {
            oldUser = JSON.parse(localStorage.getItem('user'));
        } catch (e) { }

        walletBackend.get(`/health`); //just to warm up the backend server
        if (oldUser && oldUser.id) {
            getUserDetails(oldUser);
            getTransList(oldUser);
        } else {
            Swal.fire({
                title: 'Setup new wallet',
                text: 'Enter your name. e.g. "Madhav Sharma".',
                input: 'text',
                inputPlaceholder: "Name",
                showCancelButton: false,
                confirmButtonText: 'Create!',
                showLoaderOnConfirm: true,
                ...disableSwalConfig,
                preConfirm: (name) => {
                    if (!name || name.length < 4 || name.length > 25) return Swal.showValidationMessage(`Name length should be between 4 to 25 characters`);
                    return walletBackend.post('/wallet/setup', {
                        name,
                        balance: 0
                    }).then(result => {
                        let newUser = result.data.data;
                        setUser(newUser)
                        localStorage.setItem('user', JSON.stringify(newUser));
                        Swal.fire(`Good job! ${result.data.data.name}`, "Your wallet is ready to use!", "success");
                    }).catch(error => {
                        let errorMsg = `Request failed: ${error}`;
                        if (error && error.response && error.response.data) {
                            errorMsg = error.response.data.prettyMsg;
                        }
                        Swal.showValidationMessage(errorMsg);
                    });
                }
            });
        }

    }, []);// eslint-disable-line react-hooks/exhaustive-deps
    return (
        <>
            {(user && user.id) ? (
                <>
                    <div className="ui raised very padded text container segment">
                        <div className="card">
                            <div className="content">
                                <div className="header">
                                    Hello, {user.name} 👋
                                </div>
                                <br></br>
                                <div className="description">
                                    Current Balance: INR <b>{user.balance}</b>
                                </div>
                            </div>
                            <div className="extra content">
                                <div className="ui two buttons">
                                    <div className="ui basic green button" onClick={() => addOrPayMoney('Add')}>Add Money</div>
                                    <div className="ui basic red button" onClick={() => addOrPayMoney('Pay')}>Pay</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="ui active inverted dimmer">
                    <div className="ui large text loader">Loading</div>
                </div>
            )
            }
            {(transList && transList.length) ? (
                <>
                    <div className="ui raised very padded text container segment">
                        <h1>Transactions</h1>
                        <table className="ui celled table fixed unstackable">
                            <thead>
                                <tr><th>Date</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                    {/* <th>Type</th> */}
                                </tr></thead>
                            <tbody>
                                {transList.map((ele, index) => (<tr key={index}>
                                    <td data-label="Date">{new Date(ele.date).toLocaleString()}</td>
                                    <td data-label="Description">{ele.description}</td>
                                    <td className={ele.type === 'CREDIT' ? 'negative' : 'positive'} data-label="Amount">{Math.abs(ele.amount)} ({ele.type === 'CREDIT' ? 'Cr' : 'Dr'})</td>
                                    <td data-label="Balance">{ele.balance}</td>
                                    {/* <td data-label="Type">{ele.type}</td> */}
                                </tr>))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </>
    );
}

export default App;