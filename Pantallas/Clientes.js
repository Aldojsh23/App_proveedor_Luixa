import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    RefreshControl,
    LayoutAnimation,
    UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

if (Platform.OS === "android") {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Clientes = ({ route, navigation }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [proveedorId, setProveedorId] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();


    useEffect(() => {
        const loadSession = async () => {
            const session = await getSession();
            if (session?.id) setProveedorId(session.id);
            else if (route.params?.id_proveedor) setProveedorId(route.params.id_proveedor);
            else Alert.alert("Error", "No se pudo identificar al proveedor");
        };
        loadSession();
    }, []);

    const obtener_clientes = async () => {
        const { data, error } = await supabase
            .from("clientes")
            .select("*")
            .eq("id_proveedor", proveedorId);

        if (!error) setClientes(data || []);
    };

    useFocusEffect(
        React.useCallback(() => {
            if (proveedorId) obtener_clientes();
        }, [proveedorId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await obtener_clientes();
        setRefreshing(false);
    };

    const eliminar_cliente = async (id_cliente) => {
        Alert.alert(
            "Eliminar cliente",
            "¿Deseas eliminar este cliente?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        await supabase.from("clientes").delete().eq("id_cliente", id_cliente);
                        obtener_clientes();
                    }
                }
            ]
        );
    };

    const ClienteCard = ({ item }) => {
        const expanded = expandedId === item.id_cliente;

        const toggle = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedId(expanded ? null : item.id_cliente);
        };

        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={toggle}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.alias_cliente.charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.alias}>{item.alias_cliente}</Text>
                        <Text style={styles.subText}>{item.telefono_cliente}</Text>
                    </View>

                    <TouchableOpacity onPress={() => eliminar_cliente(item.id_cliente)}>
                        <MaterialIcons name="delete-outline" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                </View>

                {expanded && (
                    <View style={styles.cardBody}>
                        <Info label="Nombre" value={`${item.nombre_cliente} ${item.apellidos_cliente}`} />
                        <Info label="Procedencia" value={`${item.municipio}, ${item.estado}`} />

                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => navigation.navigate("Clientes_agregar", { cliente: item })}
                        >
                            <MaterialIcons name="edit" size={18} color="#fff" />
                            <Text style={styles.editText}>Editar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const Info = ({ label, value }) => (
        <View style={styles.infoRow}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <SafeAreaView className="flex-1 bg-white" style={[styles.container, { paddingTop: insets.top }]}>
                {/* HEADER */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Clientes</Text>
                </View>

                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {clientes.length > 0 ? (
                        <FlatList
                            data={clientes}
                            renderItem={({ item }) => <ClienteCard item={item} />}
                            keyExtractor={(item) => item.id_cliente.toString()}
                            scrollEnabled={false}
                        />
                    ) : (
                        <View style={styles.empty}>
                            <MaterialIcons name="people-outline" size={80} color="#bdc3c7" />
                            <Text style={styles.emptyText}>No hay clientes registrados</Text>
                        </View>
                    )}
                </ScrollView>

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate("Clientes_agregar")}
                >
                    <MaterialIcons name="person-add" size={28} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f4f6f8" },

header: {
    backgroundColor: "#2980b9",
    marginTop: 0, // Antes: 50
    paddingTop: 10, // Nuevo: más espacio arriba
    paddingBottom: 24, // Más espacio abajo
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
},

headerTitle: {
    color: "#fff",
    fontSize: 30, // Antes: 24
    fontWeight: "900", // Más negrita
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "rgba(44,62,80,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
},

    card: {
        backgroundColor: "#fff",
        margin: 16,
        borderRadius: 16,
        padding: 16,
        elevation: 4,
    },

    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#3498db",
        alignItems: "center",
        justifyContent: "center",
    },

    avatarText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },

    alias: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#2c3e50",
    },

    subText: {
        fontSize: 13,
        color: "#7f8c8d",
    },

    cardBody: {
        marginTop: 16,
        gap: 10,
    },

    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    label: {
        color: "#95a5a6",
        fontSize: 13,
    },

    value: {
        color: "#2c3e50",
        fontWeight: "600",
    },

    editBtn: {
        marginTop: 12,
        backgroundColor: "#2980b9",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        padding: 10,
        borderRadius: 8,
    },

    editText: {
        color: "#fff",
        fontWeight: "600",
    },

    empty: {
        alignItems: "center",
        marginTop: 80,
    },

    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: "#7f8c8d",
    },

    fab: {
        position: "absolute",
        right: 20,
        bottom: 30,
        backgroundColor: "#27ae60",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },
});

export default Clientes;
