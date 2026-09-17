import 'package:dio/dio.dart';
import 'token_storage.dart';

/// Backend manzili. Ishlab chiqarishda haqiqiy domenga almashtiriladi
/// (masalan --dart-define=API_BASE_URL=https://maktab.ecos.uz orqali build vaqtida).
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://maktab.ecos.uz',
);

/// Markaziy Dio HTTP klient — har bir so'rovga avtomatik JWT va Accept-Language
/// header'ini qo'shadi (veb-ilovadagi api.js bilan bir xil kontrakt).
class ApiClient {
  ApiClient(this._tokenStorage) {
    _dio = Dio(BaseOptions(
      baseUrl: kApiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _tokenStorage.readToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        options.headers['Accept-Language'] = _language;
        return handler.next(options);
      },
    ));
  }

  late final Dio _dio;
  final TokenStorage _tokenStorage;
  String _language = 'uz';

  void setLanguage(String lang) => _language = lang;

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _dio.get<T>(path, queryParameters: query);

  Future<Response<T>> post<T>(String path, {Object? data}) => _dio.post<T>(path, data: data);

  Future<Response<T>> put<T>(String path, {Object? data}) => _dio.put<T>(path, data: data);

  Future<Response<T>> patch<T>(String path, {Object? data}) => _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);
}

/// Backend xato javoblari doim {"error": "..."} shaklida keladi (I18nService orqali
/// lokalizatsiya qilingan) — buni Dio xatosidan chiqarib olish uchun yordamchi.
String apiErrorMessage(Object error, {String fallback = 'Xatolik yuz berdi'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is String) return data['error'] as String;
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Serverga ulanib bo\'lmadi. Internetni tekshiring.';
    }
  }
  return fallback;
}
