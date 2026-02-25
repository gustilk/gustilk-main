import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function PaymentCallbackPage() {
  const { status } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => navigate('/premium'), 3000);
  }, []);

  return (
    <div className="payment-callback">
      {status === 'success' ? (
        <div className="payment-success">
          <div className="icon">🎉</div>
          <h2>Payment Successful!</h2>
          <p>Welcome to Premium! Redirecting...</p>
        </div>
      ) : (
        <div className="payment-failed">
          <div className="icon">❌</div>
          <h2>Payment Failed</h2>
          <p>Something went wrong. Redirecting...</p>
        </div>
      )}
    </div>
  );
}
