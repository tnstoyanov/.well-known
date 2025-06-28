  /* define a button handler */
document.getElementById('apple-pay-button').addEventListener('click', function () {
    /* create initial apple pay overlay parameters */
    let paymentRequest = {
        merchantSiteId: 184063, // use your own merchant site ID provided by Nuvei
        env: 'int', // Nuvei API environment - 'int' (integration) or 'prod' (production - default if omitted)
        applicationData: "RGVtbyBzaXRl",  // use your own 64-bit encoded data
        // merchantCapabilities : ['supports3DS','supportsCredit'] //optional
        // optional overwrite of the default ['supports3DS'] //optional
        // supportedNetworks: ['discover', 'visa', 'masterCard'] //optional
      /*
        optional could be overwritten, default value is 
        ['amex', 'chinaUnionPay', 'privateLabel', 'discover', 'visa', 'masterCard', 'jcb'], 
        you can request only debit cards or only credit cards otherwise all are allowed 
      */
        requiredBillingContactFields: ['postalAddress', 'name', 'phone', 'email'],
        countryCode: 'BG',
        currencyCode: 'EUR',
        total: {
            label: 'Apple Pay Test topup',
            amount: '100.00'
        }
    };
    /* custom function that sends data to server */
    let postTransactionData = function (url, trxData, callback) {
        let xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
        xhr.onload = function () {
            if (xhr.readyState === 4) {
                let data = {};
                try {
                    data = JSON.parse(this.responseText);
                } catch (e) {
                }
                callback (data);
            }
        };
        let reject = function () {
            callback({});
        };
        xhr.onerror = reject;
        xhr.timeout = 30000;
        xhr.ontimeout = reject;
        xhr.send(JSON.stringify(trxData));
    };

    /* initialize session by calling sfc.applePay.buildSession, 
    a function defined in the external js file provided by Nuvei */
    let session = sfc.applePay.buildSession(paymentRequest, (result, completion) => {
        /* postTransactionData is a function that calls server with provided data 
        using Nuvei API and callback receives status from server */
        postTransactionData(uploadUrl, result, function (srvResult) {
            // depending on status returned, completion method should be called with true or false
            if (srvResult.transactionStatus && srvResult.transactionStatus === 'APPROVED') {
                completion(true);
            } else {
                completion(false);
            }
        })
        //session.abort();
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