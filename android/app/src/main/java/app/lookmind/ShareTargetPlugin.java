package app.lookmind;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.UUID;

@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    @Override
    public void load() {
        handleIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (action == null) return;
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return;
        }

        JSObject data = new JSObject();
        String title = intent.getStringExtra(Intent.EXTRA_TITLE);
        data.put("title", title == null ? "" : title);

        JSArray texts = new JSArray();
        String extraText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (extraText != null && !extraText.isEmpty()) {
            texts.put(extraText);
        }
        data.put("texts", texts);

        JSArray files = new JSArray();
        if (Intent.ACTION_SEND.equals(action)) {
            JSObject file = copyUri(streamUri(intent));
            if (file != null) files.put(file);
        } else {
            ArrayList<Uri> uris = streamUris(intent);
            if (uris != null) {
                for (Uri uri : uris) {
                    JSObject file = copyUri(uri);
                    if (file != null) files.put(file);
                }
            }
        }
        data.put("files", files);
        notifyListeners("shareReceived", data, true);
        getActivity().setIntent(new Intent(getActivity(), MainActivity.class));
    }

    private Uri streamUri(Intent intent) {
        if (Build.VERSION.SDK_INT >= 33) {
            return intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        }
        return intent.getParcelableExtra(Intent.EXTRA_STREAM);
    }

    private ArrayList<Uri> streamUris(Intent intent) {
        if (Build.VERSION.SDK_INT >= 33) {
            return intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri.class);
        }
        return intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
    }

    private JSObject copyUri(Uri uri) {
        if (uri == null) return null;
        String type = getContext().getContentResolver().getType(uri);
        if (type == null) type = "image/jpeg";
        if (!type.startsWith("image/")) return null;
        String ext = "jpg";
        if (type.contains("png")) ext = "png";
        else if (type.contains("webp")) ext = "webp";
        else if (type.contains("gif")) ext = "gif";
        File out = new File(getContext().getCacheDir(), "share-" + UUID.randomUUID() + "." + ext);
        try (
            InputStream input = getContext().getContentResolver().openInputStream(uri);
            FileOutputStream output = new FileOutputStream(out)
        ) {
            if (input == null) return null;
            byte[] buf = new byte[8192];
            int n;
            while ((n = input.read(buf)) > 0) {
                output.write(buf, 0, n);
            }
        } catch (Exception error) {
            return null;
        }
        JSObject file = new JSObject();
        file.put("uri", "file://" + out.getAbsolutePath());
        file.put("name", out.getName());
        file.put("mimeType", type);
        return file;
    }
}
