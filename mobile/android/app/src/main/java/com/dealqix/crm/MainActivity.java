package com.dealqix.crm;

import android.Manifest;
import android.app.*;
import android.os.Bundle;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;

public class MainActivity extends Activity {
    private WebView web;
    private PermissionRequest microphone;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private ValueCallback<Uri[]> fileCallback;
    private static final int MIC=10, LOCATION=11, FILE=12;
    private static boolean trusted(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) &&
            ("www.dealqix.com".equals(uri.getHost()) || "dealqix.com".equals(uri.getHost())) &&
            (uri.getPort()==-1 || uri.getPort()==443);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff29379d);
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xfff8f9ff);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        LinearLayout toolbar=new LinearLayout(this);
        TextView title=new TextView(this); title.setText("Dealqix CRM"); title.setTextSize(18); title.setTextColor(0xff29379d); title.setPadding(24,16,0,16);
        toolbar.addView(title,new LinearLayout.LayoutParams(0,-2,1));
        Button refresh=new Button(this);refresh.setText("Refresh");refresh.setOnClickListener(v->web.reload());toolbar.addView(refresh);
        root.addView(toolbar);
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUseWideViewPort(true);settings.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();if(trusted(uri))return false;
                String scheme=uri.getScheme();
                if("https".equals(scheme)||"mailto".equals(scheme)||"tel".equals(scheme)){
                    try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException ignored){}
                }
                return true;
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){
                if(request.isForMainFrame())Toast.makeText(MainActivity.this,"Unable to connect. Check internet and tap Refresh.",Toast.LENGTH_LONG).show();
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{
                if(!trusted(request.getOrigin())){request.deny();return;}
                boolean audio=false;for(String r:request.getResources())if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r))audio=true;
                if(!audio){request.deny();return;}
                if(microphone!=null)microphone.deny();microphone=request;
                if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)grantMicrophone();
                else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC);
            });}
            @Override public void onPermissionRequestCanceled(PermissionRequest request){if(microphone==request)microphone=null;}
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                if(!trusted(Uri.parse(origin))){callback.invoke(origin,false,false);return;}
                if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);
                locationCallback=callback;locationOrigin=origin;
                if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED)finishLocation(true);
                else requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION);
            }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!trusted(Uri.parse(view.getUrl())))return false;
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                try{startActivityForResult(params.createIntent(),FILE);}catch(ActivityNotFoundException e){fileCallback=null;callback.onReceiveValue(null);}
                return true;
            }
        });
        if(state==null || web.restoreState(state)==null)web.loadUrl("https://www.dealqix.com/login");
    }
    private void grantMicrophone(){if(microphone!=null){microphone.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});microphone=null;}}
    private void finishLocation(boolean allowed){if(locationCallback!=null){locationCallback.invoke(locationOrigin,allowed,false);locationCallback=null;}}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){
        super.onRequestPermissionsResult(request,permissions,grants);
        if(request==MIC){if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)grantMicrophone();else if(microphone!=null){microphone.deny();microphone=null;}}
        if(request==LOCATION)finishLocation(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==FILE && fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);web.saveState(state);}
    @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();}
    @Override protected void onDestroy(){if(microphone!=null)microphone.deny();finishLocation(false);if(fileCallback!=null)fileCallback.onReceiveValue(null);web.destroy();super.onDestroy();}
}
