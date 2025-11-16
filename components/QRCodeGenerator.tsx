import React, { useEffect, useRef } from 'react';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeGeneratorProps {
  onRefReady: (ref: any) => void;
  value: string;
  size?: number;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  onRefReady,
  value,
  size = 160
}) => {
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    if (qrCodeRef.current && onRefReady) {
      onRefReady(qrCodeRef.current);
    }
  }, [onRefReady]);

  return (
    <QRCode
      value={value}
      size={size}
      backgroundColor="white"
      color="black"
      getRef={(ref) => {
        qrCodeRef.current = ref;
        if (ref && onRefReady) {
          onRefReady(ref);
        }
      }}
    />
  );
};