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
#
# DEMO_MODE (standart: false — HAQIQIY serverga ulanadi):
#   Soxta (offline) ma'lumot bilan namoyish APK'si kerak bo'lsa:
#     docker build --build-arg DEMO_MODE=true -t maktab-mobile-demo .
#   MUHIM (2026-09-25 audit): avval bu qator umuman yo'q edi va Dart tomonidagi standart
#   qiymat `true` edi — natijada shu Dockerfile bilan qurilgan HAR BIR APK (tarqatilgani
#   ham) demo rejimda ishlagan: parol tekshirilmasdan MockData ko'rsatilgan.

FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

ARG API_BASE_URL=https://maktab.ecos.uz
ARG DEMO_MODE=false

# Repo'da faqat lib/ va pubspec.yaml bor — android/ papkasi (native Gradle loyihasi)
# hali generatsiya qilinmagan, chunki buni faqat Flutter SDK o'zi qila oladi.
COPY . .
RUN flutter create --platforms=android --org uz.ecos.maktab .
RUN flutter pub get
RUN flutter build apk --release \
      --dart-define=API_BASE_URL=${API_BASE_URL} \
      --dart-define=DEMO_MODE=${DEMO_MODE}
