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
    const [currentPage, setCurrentPage] = useState(1);
    const [skipRecords, setSkipRecords] = useState(0);
    const [isExportProcessing, setIsExportProcessing] = useState(false);
    const limitRecords = 10;
    const getUserDetails = async (user) => {

        try {
            const { data: { data } } = await walletBackend.get(`/wallet/${user.id}`);
            setUser(data);
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            localStorage.clear();
        }
    }
    const getTransList = async (user, skipRecords) => {

        try {
            const { data: { data } } = await walletBackend.get(`/transactions`, {
                params: {
                    walletId: user.id,
                    skip: skipRecords,
                    limit: limitRecords
                }
            });
            if (data instanceof Array && data.length) {
                setTranslist(data);
            }
            return data;
        } catch (error) {

        }
    }

    const exportToCSV = async () => {

        try {
            setIsExportProcessing(true);
            let { data } = await walletBackend.get(`/transactions/all/${user.id}`);
            data = data.replace(/}/g, "},").replace(/,]/, "]");
            data = JSON.parse(data);
            if (data instanceof Array && data.length) {
                let csvData = [Object.keys(data[0])];
                data.forEach(ele => csvData.push(Object.values(ele)));
                let csvContent = "data:text/csv;charset=utf-8," + csvData.join('\n');
                var encodedUri = encodeURI(csvContent);
                // window.open(encodedUri);
                var link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `${user.name} - transactions.csv`);
                document.body.appendChild(link);
                link.click();
                setIsExportProcessing(false);
            }
        } catch (error) {
            setIsExportProcessing(false);
            Swal.fire('Error', error.toString(), 'error');
        }
    }



    const addOrPayMoney = (event) => {
        const action = event.target.dataset.action;
        const html = `
            <form>
             <label>Enter the amount(with max 4 decimal point). e.g. "1000" or "10.5555"</label><br/>
             <input id="amount" autocomplete="off" class="swal2-input" placeholder="Amount" type="number" />
             <input id="description" autocomplete="off" class="swal2-input" placeholder="Description" type="text" />
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
                if (!description) return Swal.showValidationMessage(`Description can't be empty`);
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
                    getTransList(user, skipRecords);
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
    const pageChangeListener = async (action) => {
        let variation;
        if (action === 'prev') {
            if (skipRecords === 0) {
                return;
            }
            variation = skipRecords - limitRecords;
        } else {
            if (transList.length < limitRecords) {
                return;
            }
            variation = skipRecords + limitRecords;
        }
        const data = await getTransList(user, variation);
        if (data instanceof Array && data.length === 0) {
            variation = (action === 'prev')
                ? variation + limitRecords
                : variation - limitRecords;
        }
        setSkipRecords(variation);
        setCurrentPage(Math.ceil((variation + 1) / limitRecords));

    }
    useEffect(() => {
        let oldUser;
        try {
            oldUser = JSON.parse(localStorage.getItem('user'));
        } catch (e) { }

        walletBackend.get(`/health`); //just to warm up the backend server
        if (oldUser && oldUser.id) {
            getUserDetails(oldUser);
            getTransList(oldUser, skipRecords);
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
                                    <div className="ui basic green button" data-action="Add" onClick={(e) => addOrPayMoney(e)}>Add Money</div>
                                    <div className="ui basic red button" data-action="Pay" onClick={(e) => addOrPayMoney(e)}>Pay</div>
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
                        <button title="Export in CSV" className={`ui icon button basic positive right floated ${isExportProcessing ? 'loading disabled' : ''}`} onClick={() => exportToCSV()}>
                            <i className="download icon"></i>
                        </button>
                        <div>
                        </div>
                        <table className="ui celled table fixed unstackable">
                            <thead>
                                <tr><th>Date</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                </tr></thead>
                            <tbody>
                                {transList.map((ele, index) => (<tr key={index}>
                                    <td data-label="Date">{new Date(ele.date).toLocaleString()}</td>
                                    <td data-label="Description">{ele.description}</td>
                                    <td className={ele.type === 'CREDIT' ? 'positive' : 'negative'} data-label="Amount">{Math.abs(ele.amount)} ({ele.type === 'CREDIT' ? 'Cr' : 'Dr'})</td>
                                    <td data-label="Balance">{ele.balance}</td>
                                </tr>))}
                            </tbody>
                        </table>
                        <div className="ui buttons three" >
                            <button className={`ui button ${(skipRecords === 0) ? 'disabled' : 'active'}`} onClick={() => pageChangeListener('prev')}>
                                <i className="left arrow icon"></i>Previous
                            </button>
                            <div className="or" data-Text={currentPage}></div>
                            <button className={`ui button ${(limitRecords > transList.length) ? 'disabled' : 'active'}`} onClick={() => pageChangeListener('next')}>
                                Next<i className="right arrow icon"></i>
                            </button>
                        </div>
                    </div>
                </>
            ) : null}
        </>
    );
}

export default App;