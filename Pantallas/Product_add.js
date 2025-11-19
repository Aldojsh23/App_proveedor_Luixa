import { useEffect, useState } from "react";
import {
    SafeAreaView, ScrollView, View, Text, TextInput,
    FlatList, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, Dimensions,
    RefreshControl, Image, ActivityIndicator
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";
const { width } = Dimensions.get('window');

const Product_add = ({ route }) => {
    const [proveedorId, setProveedorId] = useState(null);
    const [productos, setProductos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        id_producto: null,
        nombre_producto: '',
        cantidad_producto: '',
        precio_producto: '',
        talla_producto: '',
        categoria_producto: '',
        imagen_url: null,
        imagen_local: null // Para preview local
    });

    // Solicitar permisos de la galería
    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Permisos necesarios',
                        'Se necesitan permisos para acceder a la galería de imágenes'
                    );
                }
            }
        })();
    }, []);

    // Obtener productos
    useEffect(() => {
        if (proveedorId) {
            obtenerProductos();
        }
    }, [proveedorId]);

    const obtenerProductos = async () => {
        console.log("Obteniendo productos para proveedor:", proveedorId);
        const { data, error } = await supabase
            .from("producto")
            .select("*")
            .eq("id_proveedor", proveedorId);

        if (error) {
            console.error("Error al obtener productos:", error.message);
            Alert.alert("Error", "No se pudieron cargar los productos");
        } else {
            console.log("Productos obtenidos:", data);

            // Procesar las URLs de imagen para corregir formato incorrecto
            const productosCorregidos = data?.map(producto => {
                let imagenUrl = producto.imagen_url;

                // Si la URL es un JSON string, extraer la URL real
                if (imagenUrl && typeof imagenUrl === 'string' && imagenUrl.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(imagenUrl);
                        imagenUrl = parsed.publicURL || parsed.publicUrl || null;
                        console.log(`URL corregida para ${producto.nombre_producto}:`, imagenUrl);
                    } catch (e) {
                        console.log('Error parseando URL:', e);
                    }
                }

                return {
                    ...producto,
                    imagen_url: imagenUrl
                };
            });

            // Verificar si hay imágenes
            productosCorregidos?.forEach((producto, index) => {
                console.log(`Producto ${index + 1} - ${producto.nombre_producto}:`, {
                    tiene_imagen: !!producto.imagen_url,
                    url: producto.imagen_url
                });
            });

            setProductos(productosCorregidos || []);
        }
    };

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
            id_producto: null,
            nombre_producto: '',
            cantidad_producto: '',
            precio_producto: '',
            talla_producto: '',
            categoria_producto: '',
            imagen_url: null,
            imagen_local: null
        });
    };

    const validarFormulario = () => {
        if (!form.nombre_producto.trim()) {
            Alert.alert("Error", "El nombre del producto es obligatorio");
            return false;
        }
        if (!form.cantidad_producto || isNaN(form.cantidad_producto) || parseInt(form.cantidad_producto) < 0) {
            Alert.alert("Error", "La cantidad debe ser un número válido");
            return false;
        }
        if (!form.precio_producto || isNaN(form.precio_producto) || parseFloat(form.precio_producto) < 0) {
            Alert.alert("Error", "El precio debe ser un número válido");
            return false;
        }
        if (!form.talla_producto.trim()) {
            Alert.alert("Error", "La talla del producto es obligatoria");
            return false;
        }
        if (!form.categoria_producto.trim()) {
            Alert.alert("Error", "La categoría del producto es obligatoria");
            return false;
        }
        return true;
    };

    // Seleccionar imagen de la galería
    const seleccionarImagen = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setForm({
                    ...form,
                    imagen_local: result.assets[0].uri
                });
            }
        } catch (error) {
            console.error('Error al seleccionar imagen:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    // Subir imagen a Supabase Storage
    const subirImagen = async (uri) => {
        try {
            console.log('Iniciando subida de imagen:', uri);

            // Crear FormData para la subida
            const formData = new FormData();

            // Obtener información del archivo
            const fileName = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(fileName);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            // Crear nombre único para el archivo
            const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${match ? match[1] : 'jpg'}`;
            const filePath = `${proveedorId}/${uniqueFileName}`;

            // En React Native, necesitamos crear el objeto de archivo de esta manera
            const file = {
                uri: uri,
                name: uniqueFileName,
                type: type
            };

            console.log('Subiendo archivo:', filePath);

            // Subir a Supabase Storage
            const { data, error } = await supabase.storage
                .from('productos')
                .upload(filePath, file, {
                    contentType: type,
                    upsert: false
                });

            if (error) {
                console.error('Error de Supabase:', error);
                throw error;
            }

            console.log('Archivo subido exitosamente:', data);

            // Obtener URL pública
            // Método 1: Usando getPublicUrl
            const urlResponse = supabase.storage
                .from('productos')
                .getPublicUrl(filePath);

            console.log('Respuesta completa de getPublicUrl:', urlResponse);

            let publicUrl = null;

            // Intentar extraer la URL de diferentes formatos posibles
            if (typeof urlResponse === 'string') {
                publicUrl = urlResponse;
            } else if (urlResponse?.data?.publicUrl) {
                publicUrl = urlResponse.data.publicUrl;
            } else if (urlResponse?.publicUrl) {
                publicUrl = urlResponse.publicUrl;
            } else if (urlResponse?.publicURL) {
                publicUrl = urlResponse.publicURL;
            } else if (urlResponse?.data?.publicURL) {
                publicUrl = urlResponse.data.publicURL;
            }

            // Método 2: Si el método 1 falla, construir URL manualmente
            if (!publicUrl || publicUrl === 'undefined') {
                const supabaseUrl = supabase.storage.url.replace('/storage/v1', '');
                publicUrl = `${supabaseUrl}/storage/v1/object/public/productos/${filePath}`;
            }

            console.log('URL pública final:', publicUrl);

            if (!publicUrl || publicUrl === 'undefined') {
                throw new Error('No se pudo obtener la URL pública de la imagen');
            }

            return publicUrl;
        } catch (error) {
            console.error('Error al subir imagen:', error);
            throw error;
        }
    };

    const agregarOActualizarProducto = async () => {
        if (!validarFormulario()) return;

        setUploading(true);

        try {
            let imagenUrl = form.imagen_url;

            // Si hay una nueva imagen local, subirla
            if (form.imagen_local && form.imagen_local !== form.imagen_url) {
                imagenUrl = await subirImagen(form.imagen_local);

                // Si estamos editando y había una imagen anterior, eliminarla
                if (form.id_producto && form.imagen_url) {
                    await eliminarImagenStorage(form.imagen_url);
                }
            }

            const nuevoProducto = {
                nombre_producto: form.nombre_producto.trim(),
                cantidad_producto: parseInt(form.cantidad_producto),
                precio_producto: parseFloat(form.precio_producto),
                talla_producto: form.talla_producto.trim(),
                categoria_producto: form.categoria_producto.trim(),
                id_proveedor: proveedorId,
                imagen_url: imagenUrl
            };

            if (form.id_producto) {
                const { error } = await supabase
                    .from("producto")
                    .update(nuevoProducto)
                    .eq("id_producto", form.id_producto);
                if (error) throw error;
                Alert.alert("Éxito", "Producto actualizado correctamente");
            } else {
                const { error } = await supabase
                    .from("producto")
                    .insert(nuevoProducto);
                if (error) throw error;
                Alert.alert("Éxito", "Producto agregado correctamente");
            }

            await obtenerProductos();
            limpiarFormulario();
        } catch (error) {
            console.error("Error al guardar producto:", error.message);
            Alert.alert("Error", "No se pudo guardar el producto: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        if (route.params?.producto) {
            const producto = route.params.producto;
            setForm({
                id_producto: producto.id_producto,
                nombre_producto: producto.nombre_producto,
                cantidad_producto: producto.cantidad_producto.toString(),
                precio_producto: producto.precio_producto.toString(),
                talla_producto: producto.talla_producto,
                categoria_producto: producto.categoria_producto,
                imagen_url: producto.imagen_url,
                imagen_local: producto.imagen_url
            });
        } else {
            limpiarFormulario();
        }
    }, [route.params?.producto]);

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
                            {form.id_producto ? "Editar Producto" : "Agregar Producto"}
                        </Text>

                        {/* Sección de imagen */}
                        <View style={styles.imageSection}>
                            <Text style={styles.imageLabel}>Imagen del producto</Text>

                            {form.imagen_local ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{ uri: form.imagen_local }}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => setForm({ ...form, imagen_local: null, imagen_url: form.id_producto ? form.imagen_url : null })}
                                    >
                                        <Text style={styles.removeImageText}>✕</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.changeImageButton}
                                        onPress={seleccionarImagen}
                                        disabled={uploading}
                                    >
                                        <Text style={styles.changeImageText}>Cambiar imagen</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.imagePickerButton}
                                    onPress={seleccionarImagen}
                                    disabled={uploading}
                                >
                                    <Text style={styles.imagePickerText}>
                                        📷 Seleccionar imagen
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Nombre del producto *"
                            value={form.nombre_producto}
                            onChangeText={text => setForm({ ...form, nombre_producto: text })}
                            placeholderTextColor="#999"
                            editable={!uploading}
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Cantidad *"
                            value={form.cantidad_producto}
                            keyboardType="numeric"
                            onChangeText={text => setForm({ ...form, cantidad_producto: text })}
                            placeholderTextColor="#999"
                            editable={!uploading}
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Precio *"
                            value={form.precio_producto}
                            keyboardType="decimal-pad"
                            onChangeText={text => setForm({ ...form, precio_producto: text })}
                            placeholderTextColor="#999"
                            editable={!uploading}
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Talla*"
                            value={form.talla_producto}
                            onChangeText={text => setForm({ ...form, talla_producto: text })}
                            placeholderTextColor="#999"
                            editable={!uploading}
                        />

                        <TextInput
                            style={styles.textInput}
                            placeholder="Categoría*"
                            value={form.categoria_producto}
                            onChangeText={text => setForm({ ...form, categoria_producto: text })}
                            placeholderTextColor="#999"
                            editable={!uploading}
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.primaryButton, uploading && styles.buttonDisabled]}
                                onPress={agregarOActualizarProducto}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {form.id_producto ? "Actualizar" : "Agregar"}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryButton, uploading && styles.buttonDisabled]}
                                onPress={limpiarFormulario}
                                disabled={uploading}
                            >
                                <Text style={styles.secondaryButtonText}>Limpiar</Text>
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

    imageSection: {
        marginBottom: 20
    },

    imageLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 10
    },

    imagePickerButton: {
        backgroundColor: '#3498db',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2980b9',
        borderStyle: 'dashed'
    },

    imagePickerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    imagePreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 250,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
    },

    imagePreview: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ecf0f1'
    },

    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#e74c3c',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },

    removeImageText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 18
    },

    changeImageButton: {
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: [{ translateX: -60 }],
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },

    changeImageText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },
});

export default Product_add;