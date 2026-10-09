# Fiche store — brouillon

## Français

Nom : Akhbar Al-Kora

Description courte : Actualités football en arabe, clubs, favoris et lecture hors ligne.

Description : Retrouvez le football en arabe dans 25 catégories et les actualités de 14 clubs. Recherchez un sujet, gardez vos favoris et lisez les actualités déjà chargées sans connexion. Profitez du mode sombre, de la taille de texte réglable, de la lecture vocale et du partage. Activez les alertes locales des catégories choisies pendant l'utilisation de l'app ou un rappel quotidien à 19 h. Le contenu provient du RSS Hihi2 ; cette app n'est pas une application officielle du site. Le texte complet d'un favori non mis en cache peut nécessiter une reconnexion.

## العربية

الاسم: أخبار الكرة العالمية

الوصف المختصر: أخبار كرة القدم بالعربية، أقسام وأندية، محفوظات وقراءة دون اتصال.

الوصف: تابع أخبار كرة القدم بالعربية في ٢٥ قسمًا وأخبار ١٤ ناديًا. ابحث عن المواضيع التي تهمك واحفظ أخبارك المفضلة واقرأ الأخبار المخزنة دون اتصال. اختر الوضع الليلي وحجم الخط المناسب، واستمتع بالقراءة الصوتية ومشاركة الأخبار. تتوفر تنبيهات محلية للأقسام المختارة أثناء استخدام التطبيق وتذكير يومي الساعة ١٩:٠٠. الأخبار من خلاصات هاي كورة، والتطبيق ليس تطبيقًا رسميًا للموقع. قد يتطلب نص خبر محفوظ لم يُحمّل سابقًا اتصالًا بالإنترنت.

## Visuels et préparation de la soumission

- `assets/store/categories-web.png` et `settings-web.png` : rendus web mobile 1080×1920 ; à valider/remplacer avec un build natif avant soumission.
- `assets/store/feature-graphic.png` : bandeau 1024×500 utilisant la palette de l'app.
- Compléter l'identité et l'email du responsable, héberger la politique à une URL publique, ajouter les URLs support/privacy dans les consoles. `extra.privacyPolicyRoute` est seulement un lien interne.
- Déclarer Sentry/PostHog selon la configuration de production, leur rétention et les payloads réellement collectés. Le consentement PostHog ne contrôle pas Sentry.
- Vérifier les droits du RSS, des photos et des marques ; valider l'icône et le splash actuels.
- Tester RTL, grandes polices et permissions sur Android/iOS ; mesurer les performances release.
- Configurer compte, projet et signing EAS ; remplacer `YOUR_EAS_PROJECT_ID` avant build destiné aux utilisateurs.
- Push distants et alertes de matchs en temps réel nécessitent un backend/source fiable ; le rappel local n'implémente pas ces services.

Références : [Data safety Google Play](https://support.google.com/googleplay/android-developer/answer/10787469), [Notifications SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
