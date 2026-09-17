# Flutter SDK/Android SDK bu noutbukda o'rnatilmagan — shuning uchun APK shu Docker
# image ichida quriladi (Inventarizatsiya loyihasidagi bir xil usul).
#
# Ishlatish:
#   docker build -t maktab-mobile-build .
#   docker create --name mdmb maktab-mobile-build
#   docker cp mdmb:/app/build/app/outputs/flutter-apk/app-release.apk ./app-release.apk
#   docker rm mdmb
#
# Backend manzilini o'zgartirish uchun (standart: https://maktab.ecos.uz):
#   docker build --build-arg API_BASE_URL=https://sizning-domeningiz.uz -t maktab-mobile-build .

FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

ARG API_BASE_URL=https://maktab.ecos.uz

# Repo'da faqat lib/ va pubspec.yaml bor — android/ papkasi (native Gradle loyihasi)
# hali generatsiya qilinmagan, chunki buni faqat Flutter SDK o'zi qila oladi.
COPY . .
RUN flutter create --platforms=android --org uz.ecos.maktab .
RUN flutter pub get
RUN flutter build apk --release --dart-define=API_BASE_URL=${API_BASE_URL}
