//Esta hoja nos ayuda a crear los usuarios

import React, { useState, useEffect } from "react";
import {
    SafeAreaView, ScrollView, View, Text, TextInput,
    FlatList, Button, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";

const Clientes_agregar = ({ route }) => {
    const [proveedorId, setProveedorId] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [form, setForm] = useState({
        id_cliente: null,
        nombre_cliente: '',
        apellidos_cliente: '',
        alias_cliente: '',
        telefono_cliente: '',
        municipio: '',
        estado: '',
    });

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
            }
        };
        loadSession();
    }, []);

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
            return (false);
        }

        if (!form.apellidos_cliente.trim()) {
            Alert.alert("Error", "Los apellidos del cliente son obligatorios");
            return (false);
        }

        if (!form.alias_cliente.trim()) {
            Alert.alert("Error", "El alias del cliente es obligatorio");
            return (false);
        }

        if (!form.telefono_cliente || isNaN(form.telefono_cliente) || parseInt(form.telefono_cliente) < 0) {
            Alert.alert("Error", "El teléfono del cliente es obligatorio");
            return (false);
        }

        if (!form.municipio.trim()) {
            Alert.alert("Error", "El municipio del cliente es obligatorio");
            return (false);
        }

        if (!form.estado.trim()) {
            Alert.alert("Error", "El estado del cliente es obligatorio");
            return (false);
        }

        return (true);
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

            limpiarFormulario();
        } catch (error) {
            console.error("Error al guardar cliente:", error.message);
            Alert.alert("Error", "No se pudo guardar el cliente");
        }
    };

    useEffect(() => {
    if (route.params?.cliente) {
        const cliente = route.params.cliente;
        setForm({
            id_cliente: cliente.id_cliente,
            nombre_cliente: cliente.nombre_cliente,
            apellidos_cliente: cliente.apellidos_cliente,
            alias_cliente: cliente.alias_cliente,
            telefono_cliente: cliente.telefono_cliente.toString(),
            municipio: cliente.municipio,
            estado: cliente.estado,
        });
    }
}, [route.params?.cliente]);

    console.log("\n\n");

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <SafeAreaView style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>
                            {form.id_cliente ? "Editar Cliente" : "Agregar Cliente"}
                        </Text>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Nombre del Cliente *"
                            value={form.nombre_cliente}
                            onChangeText={text => setForm({ ...form, nombre_cliente: text })}
                            placeholderTextColor="#999"
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Apellidos del Cliente *"
                            value={form.apellidos_cliente}
                            onChangeText={text => setForm({ ...form, apellidos_cliente: text })}
                            placeholderTextColor="#999"
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Alias del Cliente (Importante)"
                            value={form.alias_cliente}
                            onChangeText={text => setForm({ ...form, alias_cliente: text })}
                            placeholderTextColor="#999"
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Municipio *"
                            value={form.municipio}
                            onChangeText={text => setForm({ ...form, municipio: text })}
                            placeholderTextColor="#999"
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Estado *"
                            value={form.estado}
                            onChangeText={text => setForm({ ...form, estado: text })}
                            placeholderTextColor="#999"
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Teléfono *"
                            value={form.telefono_cliente}
                            keyboardType="number-pad"
                            onChangeText={text => {
                                // Eliminar caracteres no numéricos
                                const cleanedText = text.replace(/[^0-9]/g, '');
                                // Limitar a 10 dígitos
                                if (cleanedText.length <= 10) {
                                    setForm({ ...form, telefono_cliente: cleanedText });
                                }
                            }}
                            placeholderTextColor="#999"
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={agregar_o_actualizar_cliente}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {form.id_cliente ? "Actualizar" : "Agregar"}
                                </Text>

                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={limpiarFormulario}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Limpiar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>

            </SafeAreaView>
        </KeyboardAvoidingView>

    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },

    scrollView: {
        flex: 1,
        paddingHorizontal: 16
    },

    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 10,
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

export default Clientes_agregar;