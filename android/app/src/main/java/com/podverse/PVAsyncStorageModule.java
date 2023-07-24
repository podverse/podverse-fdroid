package com.podverse.fdroid;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.modules.storage.ReactDatabaseSupplier;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import java.io.File;

public class PVAsyncStorageModule extends ReactContextBaseJavaModule {
    private ReactDatabaseSupplier mReactDatabaseSupplier;

    PVAsyncStorageModule(ReactApplicationContext context) {
       super(context);
       mReactDatabaseSupplier = ReactDatabaseSupplier.getInstance(context);
   }

   @Override
    public String getName() {
        return "PVAsyncStorage";
    }

    @ReactMethod
    public void getUsedStorageSize(Promise promise) {
        File f = new File(mReactDatabaseSupplier.get().getPath());
        long dbSize = f.length();
        WritableMap resultData = new WritableNativeMap();
        resultData.putInt("size", (int)dbSize);
        promise.resolve(resultData);
    }
}