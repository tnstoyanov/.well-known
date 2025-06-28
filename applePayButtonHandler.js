  /* define a button handler */
document.getElementById('apple-pay-button').addEventListener('click', function () {
    /* create initial apple pay overlay parameters */
    let paymentRequest = {
        merchantSiteId: 184063, // Nuvei merchant site ID
        env: 'int', // Nuvei API environment - 'int' (integration = sandbox) or 'prod' (production)
        requiredBillingContactFields: ['postalAddress', 'name', 'phone', 'email'],
        countryCode: 'BG',
        currencyCode: 'EUR',
        total: {
            label: 'Apple Pay Test topup',
            amount: '100.00'
        }
    };
    /* custom function that sends data to backend server */
    let processPayment = function (applePayData, completion) {
        // Prepare data to send to backend
        const paymentData = {
            mobileToken: applePayData.token,
            billingContact: applePayData.billingContact,
            amount: paymentRequest.total.amount,
            currency: paymentRequest.currencyCode,
            timestamp: new Date().toISOString()
        };

        console.log('Sending payment data to backend:', paymentData);

        // Send to local backend endpoint (change URL for production)
        fetch('http://localhost:3000/process-apple-pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Payment result:', result);
            // Call completion with success/failure
            if (result.status === 'APPROVED' || result.transactionStatus === 'APPROVED') {
                alert('Payment successful! Transaction ID: ' + (result.transactionId || 'N/A'));
                completion(true);
            } else {
                alert('Payment failed: ' + (result.error || 'Unknown error'));
                completion(false);
            }
        })
        .catch(error => {
            console.error('Payment error:', error);
            alert('Payment error: ' + error.message);
            completion(false);
        });
    };

    /* initialize session by calling sfc.applePay.buildSession, 
    a function defined in the external js file provided by Nuvei */
    let session = sfc.applePay.buildSession(paymentRequest, (result, completion) => {
        console.log('Apple Pay result received:', result);
        
        /* Process payment with Nuvei backend */
        processPayment(result, completion);
    });

    /* you can define optional handlers of various events in session,
    for example: onshippingmethodselected, onshippingcontactselected,
    onpaymentmethodselected, oncancel */
    session.onshippingmethodselected = (event) => {
        console.log('merchant – onshippingmethodselected:', event);
        setTimeout(() => {
            session.completeShippingMethodSelection({
                newTotal: {
                    label: 'new amount',
                    amount: '115.94'
                }
            })
        }, 1000);
    };

    session.oncancel = (evt) => {
        console.log('cancelled', evt)
    };

    /* overlay is triggered*/
    session.begin();
});