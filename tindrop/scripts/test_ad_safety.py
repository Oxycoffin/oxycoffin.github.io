import unittest
from ad_safety import replace_retired_units, validate_ad_safety


class AdSafetyTest(unittest.TestCase):
    def setUp(self):
        self.old = "ca-app-pub-6279728494613017/5015294938"
        self.new = "ca-app-pub-6279728494613017/1234567890"
        self.policy = {"serving_suspended": True, "retired_units": {"android_interstitial": [self.old]}}
        self.ads = {"enabled": False, "units": {"android_interstitial": self.old}}
        self.profile = {"enabled": False}
        self.config = {"ads": self.ads, "app_versions": {"1.48.0+350": {"ads": self.profile}}}

    def test_suspension_applies_to_root_and_overrides(self):
        validate_ad_safety(self.config, self.policy)
        self.profile["enabled"] = True
        with self.assertRaises(ValueError):
            validate_ad_safety(self.config, self.policy)
        self.profile["enabled"] = False
        self.ads["enabled"] = True
        with self.assertRaises(ValueError):
            validate_ad_safety(self.config, self.policy)

    def test_rotation_respects_hold_and_updates_only_matching_units(self):
        self.policy["replacements"] = {"android_interstitial": self.new}
        self.profile["units"] = {"android_interstitial": self.old, "ios_interstitial": "unrelated"}
        replace_retired_units(self.config, self.policy)
        self.assertEqual(self.ads["units"]["android_interstitial"], self.old)
        self.policy["serving_suspended"] = False
        replace_retired_units(self.config, self.policy)
        replace_retired_units(self.config, self.policy)
        self.assertEqual(self.ads["units"]["android_interstitial"], self.new)
        self.assertEqual(self.profile["units"], {"android_interstitial": self.new, "ios_interstitial": "unrelated"})
        self.policy["replacements"]["android_interstitial"] = self.old
        with self.assertRaises(ValueError):
            replace_retired_units(self.config, self.policy)

    def test_old_binaries_require_explicit_safe_replacement_after_suspension(self):
        self.policy["serving_suspended"] = False
        self.profile["enabled"] = True
        with self.assertRaises(ValueError):
            validate_ad_safety(self.config, self.policy)
        self.profile["units"] = {"android_interstitial": self.new}
        validate_ad_safety(self.config, self.policy)
        self.profile["units"]["android_interstitial"] = ""
        with self.assertRaises(ValueError):
            validate_ad_safety(self.config, self.policy)


if __name__ == "__main__":
    unittest.main()
