# Apple Pay Nuvei Integration

This project implements a complete Apple Pay integration with Nuvei payment processing.

## Project Structure

```
.well-known/
├── index.html                  # Frontend webpage with Apple Pay button
├── applePayButtonHandler.js    # Frontend Apple Pay button handler
├── backend-server.js          # Backend Node.js server for Nuvei API
├── package.json               # Node.js dependencies
└── img/
    └── tiebreakLogo.png       # Logo image
```

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd /Users/tonystoyanov/Documents/ApplePayNuvei/.well-known
npm install
```

### 2. Start the Backend Server

```bash
npm start
```

The backend server will start on `http://localhost:3000`

### 3. Serve the Frontend

You can use any static file server to serve the HTML file. For example:

```bash
# Using Python 3
python3 -m http.server 8080

# Using Node.js http-server (install globally: npm install -g http-server)
http-server -p 8080

# Using VS Code Live Server extension
# Right-click on index.html and select "Open with Live Server"
```

### 4. Test the Integration

1. Open Safari (Apple Pay only works in Safari on iOS/macOS)
2. Navigate to `http://localhost:8080/index.html`
3. Click the "Top Up with Apple Pay" button
4. Complete the Apple Pay authentication
5. The payment will be processed through Nuvei's test environment

## Configuration

### Nuvei Settings

The following Nuvei configuration is used (in `backend-server.js`):

- **Merchant ID**: `3832456837996201334`
- **Merchant Site ID**: `184063`
- **Environment**: Test/Integration (`ppp-test.nuvei.com`)
- **Currency**: EUR
- **Amount**: €100.00 (configurable)

### URL Details

- **Success URL**: `https://tnstoyanov.wixsite.com/payment-response/success`
- **Failure URL**: `https://tnstoyanov.wixsite.com/payment-response/failed`
- **Pending URL**: `https://tnstoyanov.wixsite.com/payment-response/pending`
- **Notification URL**: `https://34028ab3c57f9867b19b64a815e6a373.m.pipedream.net`

## How It Works

### 1. Frontend (Apple Pay Button)
- Uses Nuvei's `sc_api_applepay.min.js` library
- Handles Apple Pay session creation and user interaction
- Collects encrypted Apple Pay token and billing information

### 2. Backend Processing
- **Step 1**: Creates an order session with Nuvei (`/openOrder` API)
- **Step 2**: Processes payment with Apple Pay token (`/payment` API)
- Handles checksum generation for security
- Returns transaction status to frontend

### 3. Payment Flow
1. User clicks Apple Pay button
2. Apple Pay overlay appears with payment details
3. User authenticates with Touch ID/Face ID/Passcode
4. Frontend receives encrypted payment token
5. Token is sent to backend server
6. Backend calls Nuvei APIs to process payment
7. Result is returned to frontend and displayed to user

## Testing

### Test Cards
Use Nuvei's test environment with test card numbers provided in their documentation.

### Apple Pay Testing
- Requires Safari browser on iOS/macOS
- Test cards must be added to Apple Wallet
- Use iOS Simulator or physical device for testing

## Security Notes

- The `merchantSecretKey` is currently hardcoded for demo purposes
- In production, store sensitive credentials in environment variables
- Implement proper error handling and logging
- Add input validation and sanitization
- Use HTTPS in production

## Production Deployment

1. Change Nuvei environment from `'int'` to `'prod'`
2. Update API URLs from `ppp-test.nuvei.com` to `ppp.nuvei.com`
3. Use production merchant credentials
4. Implement proper secret management
5. Add SSL/TLS certificates
6. Set up proper error monitoring

## Troubleshooting

### Common Issues

1. **Apple Pay button not showing**
   - Ensure you're using Safari on iOS/macOS
   - Check that Apple Pay is set up in device settings

2. **CORS errors**
   - Make sure backend server has CORS enabled
   - Check that frontend is accessing correct backend URL

3. **Payment failures**
   - Check console logs for detailed error messages
   - Verify Nuvei credentials and configuration
   - Ensure test cards are properly configured

### Debug Mode

Enable debug logging in the browser console to see detailed payment flow information.

## API Endpoints

### Backend Server Endpoints

- `POST /process-apple-pay` - Process Apple Pay payment
- `GET /health` - Health check endpoint

### Nuvei API Endpoints Used

- `POST /openOrder.do` - Create payment session
- `POST /payment.do` - Process payment with Apple Pay token

## Dependencies

### Frontend
- Nuvei Apple Pay SDK (`sc_api_applepay.min.js`)

### Backend
- Express.js - Web framework
- CORS - Cross-origin resource sharing
- crypto - Checksum generation

## Support

For issues with:
- **Apple Pay**: Check Apple Developer documentation
- **Nuvei Integration**: Contact Nuvei support
- **This Implementation**: Check console logs and error messages
