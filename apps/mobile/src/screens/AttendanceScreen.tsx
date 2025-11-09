import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { apiClient } from '@school/api-client';

export default function AttendanceScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: any) => {
    setScanning(false);
    try {
      const studentId = data; // QR code contains student ID
      await apiClient.markAttendance({
        studentId,
        status: 'present',
        date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Attendance marked');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {!scanning ? (
        <>
          <Text style={styles.title}>Mark Attendance</Text>
          <TouchableOpacity style={styles.button} onPress={() => setScanning(true)}>
            <Text style={styles.buttonText}>Scan Student QR Code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Camera
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={handleBarCodeScanned}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
