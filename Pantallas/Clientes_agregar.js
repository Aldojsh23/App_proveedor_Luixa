import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";

const Clientes_agregar = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();

    const [proveedorId, setProveedorId] = useState(null);
    const [form, setForm] = useState({
        id_cliente: null,
        nombre_cliente: '',
        apellidos_cliente: '',
        alias_cliente: '',
        telefono_cliente: '',
        municipio: '',
        estado: '',
    });

    useEffect(() => {
        const loadSession = async () => {
            const session = await getSession();
            if (session?.id) setProveedorId(session.id);
            else if (route.params?.id_proveedor) setProveedorId(route.params.id_proveedor);
            else Alert.alert("Error", "No se pudo identificar al proveedor");
        };
        loadSession();
    }, []);

    useEffect(() => {
        if (route.params?.cliente) {
            const c = route.params.cliente;
            setForm({
                id_cliente: c.id_cliente,
                nombre_cliente: c.nombre_cliente,
                apellidos_cliente: c.apellidos_cliente,
                alias_cliente: c.alias_cliente,
                telefono_cliente: c.telefono_cliente.toString(),
                municipio: c.municipio,
                estado: c.estado,
            });
        }
    }, [route.params?.cliente]);

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
        if (!form.nombre_cliente.trim()) return Alert.alert("Error", "Nombre obligatorio");
        if (!form.apellidos_cliente.trim()) return Alert.alert("Error", "Apellidos obligatorios");
        if (!form.alias_cliente.trim()) return Alert.alert("Error", "Alias obligatorio");
        if (!form.telefono_cliente) return Alert.alert("Error", "Teléfono obligatorio");
        if (!form.municipio.trim()) return Alert.alert("Error", "Municipio obligatorio");
        if (!form.estado.trim()) return Alert.alert("Error", "Estado obligatorio");
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

            limpiarFormulario();
        } catch (error) {
            console.error("Error al guardar cliente:", error.message);
            Alert.alert("Error", "No se pudo guardar el cliente");
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.card}>

                        {/* Nombre */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Nombre *"
                                value={form.nombre_cliente}
                                onChangeText={t => setForm({ ...form, nombre_cliente: t })}
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        {/* Apellidos */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="people-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Apellidos *"
                                value={form.apellidos_cliente}
                                onChangeText={t => setForm({ ...form, apellidos_cliente: t })}
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        {/* Alias */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="pricetag-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Alias *"
                                value={form.alias_cliente}
                                onChangeText={t => setForm({ ...form, alias_cliente: t })}
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        {/* Teléfono */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Teléfono *"
                                keyboardType="number-pad"
                                value={form.telefono_cliente}
                                onChangeText={t => {
                                    const clean = t.replace(/[^0-9]/g, "");
                                    if (clean.length <= 10)
                                        setForm({ ...form, telefono_cliente: clean });
                                }}
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        {/* Municipio */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="location-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Municipio *"
                                value={form.municipio}
                                onChangeText={t => setForm({ ...form, municipio: t })}
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        {/* Estado */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="map-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Estado *"
                                value={form.estado}
                                onChangeText={t => setForm({ ...form, estado: t })}
                                placeholderTextColor="#aaa"
                            />
                        </View>

                        <View style={styles.buttons}>
                            <TouchableOpacity style={styles.primary} onPress={agregar_o_actualizar_cliente}>
                                <Text style={styles.primaryText}>
                                    {form.id_cliente ? "Actualizar" : "Guardar"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondary} onPress={limpiarFormulario}>
                                <Text style={styles.secondaryText}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f4f6f8" },

    scroll: { padding: 16 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        elevation: 4,
    },

    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
        paddingHorizontal: 12,
        marginBottom: 14,
    },

    inputIcon: {
        marginRight: 8,
    },

    inputWithIcon: {
        flex: 1,
        fontSize: 16,
        color: "#2c3e50",
        paddingVertical: 12,
    },

    buttons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
    },

    primary: {
        flex: 1,
        backgroundColor: "#27ae60",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },

    primaryText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },

    secondary: {
        flex: 1,
        backgroundColor: "#95a5a6",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },

    secondaryText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
});

export default Clientes_agregar;
