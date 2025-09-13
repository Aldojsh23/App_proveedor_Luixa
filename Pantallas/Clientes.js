import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions,
    RefreshControl, // <-- Importar RefreshControl
} from "react-native";

import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const Clientes = ({ route, navigation }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [proveedorId, setProveedorId] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [refreshing, setRefreshing] = useState(false); // Estado para refresh

    const [form, setForm] = useState({
        id_cliente: null,
        nombre_cliente: '',
        apellidos_cliente: '',
        alias_cliente: '',
        telefono_cliente: '',
        municipio: '',
        estado: '',
    });

    // Cargar sesión
    useEffect(() => {
        const loadSession = async () => {
            const session = await getSession();
            if (session?.id) {
                setProveedorId(session.id);
            } else if (route.params?.id_proveedor) {
                setProveedorId(route.params.id_proveedor);
            } else {
                Alert.alert("Error", "No se pudo identificar al proveedor");
            }
        };
        loadSession();
    }, []);

    // Función para obtener clientes
    const obtener_clientes = async () => {
        console.log("Obteniendo los clientes para el proveedor:", proveedorId);
        const { data, error } = await supabase
            .from("clientes")
            .select("*")
            .eq("id_proveedor", proveedorId);

        if (error) {
            console.error("Error al obtener los clientes:", error.message);
            Alert.alert("Error", "No se pudieron cargar los clientes");
        } else {
            setClientes(data || []);
        }
    };

    // Refrescar al enfocar la pantalla
    useFocusEffect(
        React.useCallback(() => {
            if (proveedorId) {
                obtener_clientes();
            }
        }, [proveedorId])
    );

    // Función para pull-to-refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await obtener_clientes();
        setRefreshing(false);
    };

    // Resto de funciones (limpiar, validar, agregar, eliminar, editar) permanecen igual

    const limpiarFormulario = () => {
        setForm({
            id_cliente: null,
            nombre_cliente: '',
            apellidos_cliente: '',
            alias_cliente: '',
            telefono_cliente: '',
            municipio: '',
            estado: '',
        });
    };

    const validarFormulario = () => {
        if (!form.nombre_cliente.trim()) {
            Alert.alert("Error", "El nombre del cliente es obligatorio");
            return false;
        }
        if (!form.apellidos_cliente.trim()) {
            Alert.alert("Error", "Los apellidos del cliente son obligatorios");
            return false;
        }
        if (!form.alias_cliente.trim()) {
            Alert.alert("Error", "El alias del cliente es obligatorio");
            return false;
        }
        if (!form.telefono_cliente || isNaN(form.telefono_cliente) || parseInt(form.telefono_cliente) < 0) {
            Alert.alert("Error", "El teléfono del cliente es obligatorio");
            return false;
        }
        if (!form.municipio.trim()) {
            Alert.alert("Error", "El municipio del cliente es obligatorio");
            return false;
        }
        if (!form.estado.trim()) {
            Alert.alert("Error", "El estado del cliente es obligatorio");
            return false;
        }
        return true;
    };

    const agregar_o_actualizar_cliente = async () => {
        if (!validarFormulario()) return;

        const nuevo_cliente = {
            nombre_cliente: form.nombre_cliente.trim(),
            apellidos_cliente: form.apellidos_cliente.trim(),
            alias_cliente: form.alias_cliente.trim(),
            telefono_cliente: parseInt(form.telefono_cliente),
            municipio: form.municipio.trim(),
            estado: form.estado.trim(),
            id_proveedor: proveedorId,
        };

        try {
            if (form.id_cliente) {
                const { error } = await supabase
                    .from("clientes")
                    .update(nuevo_cliente)
                    .eq("id_cliente", form.id_cliente);
                if (error) throw error;
                Alert.alert("Éxito", "Cliente actualizado correctamente");
            } else {
                const { error } = await supabase
                    .from("clientes")
                    .insert(nuevo_cliente);
                if (error) throw error;
                Alert.alert("Éxito", "Cliente agregado correctamente");
            }

            await obtener_clientes();
            limpiarFormulario();
        } catch (error) {
            console.error("Error al guardar cliente:", error.message);
            Alert.alert("Error", "No se pudo guardar el cliente");
        }
    };

    const eliminar_cliente = async (id_cliente) => {
        Alert.alert(
            "Confirmar eliminación",
            "¿Estás seguro de eliminar el cliente?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("clientes")
                                .delete()
                                .eq("id_cliente", id_cliente);
                            if (error) throw error;
                            Alert.alert("Éxito", "Cliente eliminado correctamente");
                            await obtener_clientes();
                        } catch (error) {
                            console.error("Error al eliminar cliente:", error.message);
                            Alert.alert("Error", "No se pudo eliminar el cliente");
                        }
                    }
                }
            ]
        );
    };

    const editarCliente = (cliente) => {
        navigation.navigate("Clientes_agregar", { cliente });
    };

    const Cliente_card = ({ item }) => {
        const isExpanded = expandedId === item.id_cliente;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => setExpandedId(isExpanded ? null : item.id_cliente)}
            >
                <View style={styles.card_header}>
                    <Text style={styles.cliente_name}>{item.alias_cliente}</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                editarCliente(item);
                            }}
                        >
                            <Text style={styles.editButtonText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                eliminar_cliente(item.id_cliente);
                            }}
                        >
                            <Text style={styles.deleteButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {isExpanded && (
                    <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Nombre:</Text>
                            <Text style={styles.value}>{item.nombre_cliente}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Apellidos:</Text>
                            <Text style={styles.value}>{item.apellidos_cliente}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Teléfono:</Text>
                            <Text style={styles.value}>{item.telefono_cliente}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Procedencia:</Text>
                            <Text style={styles.value}>{item.municipio}, {item.estado}</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                        <Text style={styles.title}>Clientes</Text>
                        <TouchableOpacity
                            style={styles.topRightButton}
                            onPress={() => navigation.navigate("Clientes_agregar")}
                        >
                            <MaterialIcons name="person-add-alt" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {clientes.length > 0 ? (
                        <FlatList
                            data={clientes}
                            renderItem={({ item }) => <Cliente_card item={item} />}
                            keyExtractor={(item) => item.id_cliente.toString()}
                            style={styles.clienteList}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No hay clientes registrados</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },

    scrollView: {
        flex: 1,
        paddingHorizontal: 16
    },

    title: {
        fontSize: 28,
        textAlign: "center",
        marginVertical: 20,
        fontWeight: 'bold',
        color: '#2c3e50'
    },

    clienteList: {
        marginBottom: 20
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },

    card_header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },

    cliente_name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
        marginRight: 10
    },

    actionButtons: {
        flexDirection: 'row',
        gap: 8
    },

    editButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },

    editButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },

    deleteButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },

    deleteButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },

    cardContent: {
        gap: 8
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    label: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: '500'
    },

    value: {
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '600'
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: 40
    },

    emptyStateText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center'
    },

    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },

    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c3e50'
    },

    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
        color: '#2c3e50'
    },

    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8
    },

    primaryButton: {
        backgroundColor: '#27ae60',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center'
    },

    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    secondaryButton: {
        backgroundColor: '#95a5a6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center'
    },

    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    topRightButton: {
        backgroundColor: '#2980b9',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    topRightButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default Clientes;