import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar } from "react-native";
import { clearSession, getSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";

export default function HomeScreen({ route, onLogout }) {

  const [proveedorId, setProveedorId] = useState(null);
  const [proveedorData, setProveedorData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [clientesCount, setClientesCount] = useState(0);
  const [clientesError, setClientesError] = useState(null);

  const [productosCount, setProductosCount] = useState(0);
  const [productosError, setProductosError] = useState(null);

  //Estado de pedidos
  const [pedidosHoyCount, setPedidosHoyCount] = useState(0);
  const [pedidosError, setPedidosError] = useState(null);

  // Cargar sesión al montar el componente
  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      console.log("Sesión recuperada:", session);

      if (session?.id) {
        setProveedorId(session.id);
      } else if (route.params?.id_proveedor) {
        setProveedorId(route.params.id_proveedor);
      } else {
        console.error("No se encontró ID de proveedor");
        Alert.alert("Error", "No se pudo identificar al proveedor");
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    const obtener_info_proveedor = async () => {
      try {
        console.log("Obteniendo datos para proveedor:", proveedorId);
        const { data, error } = await supabase
          .from("proveedores")
          .select("*")
          .eq("id_proveedor", proveedorId)
          .single();

        if (error) throw error;
        setProveedorData(data);
      } catch (err) {
        console.error("Error al obtener la información:", err.message);
        Alert.alert("Error", "No se pudo obtener la información del proveedor.");
      } finally {
        setLoading(false);
      }
    };

    if (proveedorId) {
      obtener_info_proveedor();
    }
  }, [proveedorId]);

  // Obtener clientes al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      const obtenerClientes = async () => {
        try {
          const { count, error } = await supabase
            .from("clientes")
            .select("*", { count: "exact", head: true })
            .eq("id_proveedor", proveedorId);

          if (error) throw error;
          setClientesCount(count);
        } catch (err) {
          console.error("Error al contar clientes:", err.message);
          setClientesError(err);
        }
      };

      if (proveedorId) {
        obtenerClientes();
      }
    }, [proveedorId])
  );

  // Obtener productos al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      const obtener_productos = async () => {
        try {
          const { count, error } = await supabase
            .from("producto")
            .select("*", { count: "exact", head: true })
            .eq("id_proveedor", proveedorId);

          if (error) throw error;
          setProductosCount(count);
        } catch (err) {
          console.error("Error al contar productos:", err.message);
          setProductosError(err);
        }
      };

      if (proveedorId) {
        obtener_productos();
      }
    }, [proveedorId])
  );

  //Obtener pedidos de hoy al enfocar la pantalla
  // Obtener pedidos de hoy al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      const obtenerPedidosHoy = async () => {
        try {
          // Generar la fecha de inicio del día (00:00:00)
          const hoy = new Date();
          const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

          // Generar en formato ISO para comparar en Supabase
          const inicioDiaISO = inicioDia.toISOString();

          const { count, error } = await supabase
            .from("pedidos")
            .select("*", { count: "exact", head: true })
            .eq("id_proveedor", proveedorId)
            .gte("fecha_creacion", inicioDiaISO); // >= inicio del día

          if (error) throw error;
          setPedidosHoyCount(count);
        } catch (err) {
          console.error("Error al contar pedidos de hoy:", err.message);
          setPedidosError(err);
        }
      };

      if (proveedorId) {
        obtenerPedidosHoy();
      }
    }, [proveedorId])
  );

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro que deseas cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar Sesión",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          onLogout?.();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ActivityIndicator size="large" />
        <Text>Cargando información del proveedor...</Text>
      </View>
    );
  }

  if (!proveedorData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Cargando datos del proveedor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcome}>¡Bienvenido!</Text>
          <View style={styles.userInfo}>
            <Text style={styles.info}>
              <Text style={styles.label}>Negocio:</Text> {proveedorData?.negocio_proveedor || 'No especificado'}
            </Text>
            <Text style={styles.info}>
              <Text style={styles.label}>Correo:</Text> {proveedorData?.correo_proveedor || 'No especificado'}
            </Text>
            <Text style={styles.info}>
              <Text style={styles.label}>Teléfono:</Text> {proveedorData?.telefono_proveedor || 'No especificado'}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pedidosHoyCount}</Text>
            <Text style={styles.statLabel}>Pedidos Hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{clientesCount}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{productosCount}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </View>
        </View>

      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  content: {
    flex: 1,
    padding: 20,
  },

  welcomeCard: {
    marginTop: 40,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  welcome: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },

  userInfo: {
    marginTop: 10,
  },

  info: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },

  label: {
    fontWeight: 'bold',
    color: '#333',
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  logoutButton: {
    backgroundColor: '#e74c3c',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
